// ---------- Dungeon Master co-op server ----------
// one file to start a game together over the local network: it serves the game itself (players open its address in a
// browser) and joins the players over a WebSocket. nothing to install: the game's files are inside.
//   --port N   listen on port N (otherwise 7777, or the next free one)
//   --dir D    serve the game from folder D instead of the copy inside (for working on the game)
//   --no-open  do not open the game in the browser on start
mod http;
mod room;
mod ws;

use room::{Out, Room};
use std::io::{IsTerminal, Write};
use std::net::{Shutdown, TcpListener, TcpStream, UdpSocket};
use std::path::PathBuf;
use std::sync::{mpsc, Arc, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant};

const PORT: u16 = 7777;

struct Shared {
    room: Mutex<Room>,
    files: http::Files,
    t0: Instant,
}

impl Shared {
    // a thread that panicked holding the room does not lock everyone else out
    fn room(&self) -> MutexGuard<'_, Room> {
        self.room.lock().unwrap_or_else(|e| e.into_inner())
    }
    // the room's news, with the time since the server started
    fn log(&self, room: &mut Room) {
        for e in room.events.drain(..) {
            let s = self.t0.elapsed().as_secs();
            println!("  {:>2}:{:02}:{:02}  {}", s / 3600, s / 60 % 60, s % 60, e);
        }
    }
}

fn fatal(msg: &str) -> ! {
    eprintln!("\n  {msg}\n");
    // started with a double click, the window would close before the message could be read
    if std::io::stdin().is_terminal() {
        eprint!("  Press Enter to close ");
        let _ = std::io::stderr().flush();
        let _ = std::io::stdin().read_line(&mut String::new());
    }
    std::process::exit(1)
}

// the address other computers reach this one at: the one the system would send from (nothing is sent)
fn lan_ip() -> Option<String> {
    let s = UdpSocket::bind("0.0.0.0:0").ok()?;
    s.connect("192.168.0.1:9").or_else(|_| s.connect("10.0.0.1:9")).ok()?;
    let ip = s.local_addr().ok()?.ip();
    (!ip.is_loopback() && !ip.is_unspecified()).then(|| ip.to_string())
}

fn open_browser(url: &str) {
    let r = if cfg!(target_os = "macos") {
        std::process::Command::new("open").arg(url).spawn()
    } else if cfg!(target_os = "windows") {
        std::process::Command::new("cmd").args(["/C", "start", "", url]).spawn()
    } else {
        std::process::Command::new("xdg-open").arg(url).spawn()
    };
    let _ = r;
}

fn main() {
    let (mut port, mut dir, mut open) = (None, None, true);
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        match a.as_str() {
            "--port" => port = Some(args.next().and_then(|p| p.parse::<u16>().ok()).unwrap_or_else(|| fatal("--port needs a number"))),
            "--dir" => dir = Some(PathBuf::from(args.next().unwrap_or_else(|| fatal("--dir needs a folder")))),
            "--no-open" => open = false,
            "-h" | "--help" => {
                println!("Dungeon Master co-op server\n  --port N   port (7777 or the next free one)\n  --dir D    serve the game from folder D\n  --no-open  do not open the browser");
                return;
            }
            _ => fatal(&format!("Unknown option {a} (try --help)")),
        }
    }
    let files = match dir {
        Some(d) => match d.canonicalize() {
            Ok(d) if d.join("index.html").is_file() => http::Files::Dir(d),
            _ => fatal(&format!("No game in {}", d.display())),
        },
        None => http::Files::Baked,
    };
    let listener = match port {
        Some(p) => TcpListener::bind(("0.0.0.0", p)).unwrap_or_else(|e| fatal(&format!("Cannot listen on port {p}: {e}"))),
        None => (PORT..PORT + 10)
            .find_map(|p| TcpListener::bind(("0.0.0.0", p)).ok())
            .unwrap_or_else(|| fatal(&format!("Ports {}-{} are all taken: is the server already running?", PORT, PORT + 9))),
    };
    let port = listener.local_addr().map(|a| a.port()).unwrap_or(PORT);
    let here = format!("http://localhost:{port}");
    println!();
    println!("  DUNGEON MASTER · co-op server");
    println!("  ─────────────────────────────");
    println!("  This computer       {here}");
    match lan_ip() {
        Some(ip) => println!("  Other computers     http://{ip}:{port}"),
        None => println!("  Other computers     (no network found: only this computer can join)"),
    }
    println!();
    println!("  Everyone opens one of these addresses in a browser and picks Play together.");
    if let http::Files::Dir(d) = &files {
        println!("  The game is served from {}", d.display())
    }
    println!("  Close this window to stop the server.");
    println!();
    let _ = std::io::stdout().flush();

    let shared = Arc::new(Shared { room: Mutex::new(Room::new()), files, t0: Instant::now() });
    {
        let sh = shared.clone();
        thread::spawn(move || loop {
            thread::sleep(Duration::from_millis(500));
            let mut r = sh.room();
            r.tick(Instant::now());
            sh.log(&mut r)
        });
    }
    if open {
        open_browser(&here)
    }
    for stream in listener.incoming().flatten() {
        let sh = shared.clone();
        thread::spawn(move || serve(stream, sh));
    }
}

// one connection: files for as long as the browser keeps it, or a WebSocket for good
fn serve(mut s: TcpStream, sh: Arc<Shared>) {
    let _ = s.set_nodelay(true);
    let _ = s.set_read_timeout(Some(Duration::from_secs(20)));
    let mut buf = Vec::new();
    loop {
        let req = match http::read_request(&mut s, &mut buf) {
            Ok(Some(r)) => r,
            _ => return,
        };
        if req.upgrade() && req.path == "/ws" {
            return websocket(s, &req, sh);
        }
        match http::respond(&mut s, &req, &sh.files) {
            Ok(true) => continue,
            _ => return,
        }
    }
}

// the frames of a batch of messages into buf, a stream's older snapshots left out for its newest (kept where the newest
// came). true: the batch ends with the connection's close
fn pack(batch: Vec<Out>, buf: &mut Vec<u8>) -> bool {
    let mut newest = std::collections::HashMap::new();
    for (i, m) in batch.iter().enumerate() {
        if let Out::Stream(k, _) = m {
            newest.insert(*k, i);
        }
    }
    for (i, m) in batch.into_iter().enumerate() {
        let _ = match m {
            Out::Text(t) => ws::write_frame(buf, 0x1, t.as_bytes()),
            Out::Stream(k, t) if newest[&k] == i => ws::write_frame(buf, 0x1, t.as_bytes()),
            Out::Stream(..) => Ok(()),
            Out::Ping => ws::write_frame(buf, 0x9, b""),
            Out::Pong(p) => ws::write_frame(buf, 0xA, &p),
            Out::Close => {
                let _ = ws::write_frame(buf, 0x8, &1000u16.to_be_bytes());
                return true;
            }
        };
    }
    false
}

// the system keeps what is written to a connection until it is through; over a slow link (a VPN across the country) a big
// buffer is seconds of old snapshots. a small one makes the writer wait instead, and what waits meanwhile is packed down to
// the newest (pack): the others' moves come late by the link's own delay, not more and more
const SEND_BUFFER: i32 = 48 * 1024;
#[cfg(any(target_os = "macos", target_os = "linux"))]
fn small_send_buffer(s: &TcpStream) {
    use std::os::fd::AsRawFd;
    extern "C" {
        fn setsockopt(fd: i32, level: i32, name: i32, value: *const std::ffi::c_void, len: u32) -> i32;
    }
    #[cfg(target_os = "macos")]
    const OPT: (i32, i32) = (0xffff, 0x1001);
    #[cfg(target_os = "linux")]
    const OPT: (i32, i32) = (1, 7);
    let v = SEND_BUFFER;
    unsafe {
        setsockopt(s.as_raw_fd(), OPT.0, OPT.1, &v as *const i32 as *const std::ffi::c_void, 4);
    }
}
#[cfg(not(any(target_os = "macos", target_os = "linux")))]
fn small_send_buffer(_: &TcpStream) {}

fn websocket(mut s: TcpStream, req: &http::Request, sh: Arc<Shared>) {
    let Some(key) = req.header("sec-websocket-key") else { return };
    let head = format!("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {}\r\n\r\n", ws::accept_key(key));
    if s.write_all(head.as_bytes()).is_err() {
        return;
    }
    let Ok(mut w) = s.try_clone() else { return };
    // a browser gone without a word (a laptop shut) takes no more: the writing gives up instead of waiting on it for good
    let _ = w.set_write_timeout(Some(Duration::from_secs(10)));
    small_send_buffer(&w);
    // everything to this player goes through one queue and one thread: a slow connection never holds up the room. what
    // waited while the last batch went out goes as one write, each stream's newest snapshot only (pack)
    let (tx, rx) = mpsc::channel::<Out>();
    let writer = thread::spawn(move || {
        let mut buf = Vec::new();
        while let Ok(first) = rx.recv() {
            let batch: Vec<Out> = std::iter::once(first).chain(rx.try_iter()).collect();
            buf.clear();
            let close = pack(batch, &mut buf);
            if w.write_all(&buf).is_err() || close {
                break;
            }
        }
        let _ = w.shutdown(Shutdown::Both);
    });
    let id = sh.room().connect(tx.clone());
    // pings go out every few seconds: this long without a word, the player is gone
    let _ = s.set_read_timeout(Some(Duration::from_secs(30)));
    let mut part = None;
    loop {
        match ws::read_message(&mut s, &mut part) {
            Ok(ws::Frame::Text(t)) => {
                let mut r = sh.room();
                r.message(id, &t);
                sh.log(&mut r)
            }
            Ok(ws::Frame::Ping(p)) => {
                let _ = tx.send(Out::Pong(p));
            }
            Ok(ws::Frame::Pong) => {}
            Ok(ws::Frame::Close) | Err(_) => break,
        }
    }
    {
        let mut r = sh.room();
        r.disconnect(id);
        sh.log(&mut r)
    }
    let _ = tx.send(Out::Close);
    drop(tx);
    let _ = writer.join();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_slow_connection_gets_only_the_newest_snapshots() {
        let s = |k, t: &str| Out::Stream(k, t.to_string());
        let batch = vec![s(1, "a1"), Out::Text("chat".into()), s(0, "m1"), s(1, "a2"), s(2, "b1"), s(0, "m2"), s(1, "a3")];
        let mut buf = Vec::new();
        assert!(!pack(batch, &mut buf));
        // the frames' texts, in order (each frame here: 0x81, its length, the text)
        let mut texts = Vec::new();
        let mut i = 0;
        while i < buf.len() {
            let n = buf[i + 1] as usize;
            texts.push(String::from_utf8(buf[i + 2..i + 2 + n].to_vec()).unwrap());
            i += 2 + n
        }
        assert_eq!(texts, ["chat", "b1", "m2", "a3"]);
        let mut buf = Vec::new();
        assert!(pack(vec![Out::Text("x".into()), Out::Close, Out::Text("y".into())], &mut buf));
        assert_eq!(&buf[..3], &[0x81, 1, b'x']);
        assert_eq!(buf[3], 0x88)
    }
}

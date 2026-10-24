// ---------- HTTP: just enough to hand the game's files to a browser and to open the WebSocket ----------
use std::collections::HashMap;
use std::io::{self, Read, Write};
use std::path::{Component, Path, PathBuf};

include!(concat!(env!("OUT_DIR"), "/files.rs"));

pub struct Request {
    pub method: String,
    pub path: String,
    headers: HashMap<String, String>,
}

impl Request {
    pub fn header(&self, k: &str) -> Option<&str> {
        self.headers.get(k).map(|s| s.as_str())
    }
    // a WebSocket upgrade: the Upgrade header names websocket, Connection includes upgrade
    pub fn upgrade(&self) -> bool {
        self.header("upgrade").is_some_and(|v| v.eq_ignore_ascii_case("websocket"))
            && self.header("connection").is_some_and(|v| v.to_ascii_lowercase().contains("upgrade"))
    }
}

const MAX_HEAD: usize = 16 * 1024;

// reads one request head; `buf` keeps what came after it for the next request on the same connection.
// None: the connection was closed before a request began
pub fn read_request<R: Read>(r: &mut R, buf: &mut Vec<u8>) -> io::Result<Option<Request>> {
    let bad = || io::Error::new(io::ErrorKind::InvalidData, "bad request");
    let end = loop {
        if let Some(i) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
            break i;
        }
        if buf.len() > MAX_HEAD {
            return Err(bad());
        }
        let mut chunk = [0u8; 4096];
        let n = r.read(&mut chunk)?;
        if n == 0 {
            return if buf.is_empty() { Ok(None) } else { Err(bad()) };
        }
        buf.extend_from_slice(&chunk[..n]);
    };
    let head = String::from_utf8_lossy(&buf[..end]).to_string();
    buf.drain(..end + 4);
    let mut lines = head.split("\r\n");
    let mut first = lines.next().ok_or_else(bad)?.split_whitespace();
    let (method, target) = (first.next().ok_or_else(bad)?.to_string(), first.next().ok_or_else(bad)?);
    let path = target.split(['?', '#']).next().unwrap_or("/").to_string();
    let mut headers = HashMap::new();
    for l in lines {
        if let Some((k, v)) = l.split_once(':') {
            headers.insert(k.trim().to_ascii_lowercase(), v.trim().to_string());
        }
    }
    Ok(Some(Request { method, path, headers }))
}

fn mime(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or("").to_ascii_lowercase().as_str() {
        "html" => "text/html; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" => "application/json",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "txt" | "md" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

// %xx in a path
fn unescape(s: &str) -> String {
    let b = s.as_bytes();
    let hex = |c: u8| (c as char).to_digit(16);
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let (Some(h), Some(l)) = (hex(b[i + 1]), hex(b[i + 2])) {
                out.push((h * 16 + l) as u8);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1
    }
    String::from_utf8_lossy(&out).to_string()
}

// what of the game folder is handed out (build.rs bakes in the same): the page and what it loads, nothing else
const SERVED: [&str; 5] = ["index.html", "css/", "js/", "lib/", "img/"];

// where the files come from: baked in, or a folder on disk (--dir, for working on the game without rebuilding)
pub enum Files {
    Baked,
    Dir(PathBuf),
}

impl Files {
    // the file's path in the game folder and its bytes
    fn get(&self, path: &str) -> Option<(String, Vec<u8>)> {
        let rel = unescape(path.trim_start_matches('/'));
        let rel = if rel.is_empty() { "index.html".to_string() } else { rel };
        // nothing above the game's folder, nothing hidden
        let p = Path::new(&rel);
        if p.components().any(|c| !matches!(c, Component::Normal(_)))
            || rel.split('/').any(|s| s.starts_with('.'))
            || !SERVED.iter().any(|s| rel == *s || s.ends_with('/') && rel.starts_with(s))
        {
            return None;
        }
        let body = match self {
            Files::Baked => FILES.iter().find(|(k, _)| *k == rel).map(|(_, v)| v.to_vec()),
            Files::Dir(root) => std::fs::read(root.join(p)).ok(),
        };
        body.map(|b| (rel, b))
    }
}

// answers a request for a file; false: the connection is to be closed
pub fn respond<W: Write>(w: &mut W, req: &Request, files: &Files) -> io::Result<bool> {
    let keep = !req.header("connection").is_some_and(|v| v.eq_ignore_ascii_case("close"));
    let conn = if keep { "keep-alive" } else { "close" };
    let (status, kind, body) = if req.method != "GET" && req.method != "HEAD" {
        ("405 Method Not Allowed", "text/plain; charset=utf-8", b"Method not allowed".to_vec())
    } else {
        match files.get(&req.path) {
            Some((rel, b)) => ("200 OK", mime(&rel), b),
            None => ("404 Not Found", "text/plain; charset=utf-8", b"Not found".to_vec()),
        }
    };
    let head = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {kind}\r\nContent-Length: {}\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nConnection: {conn}\r\n\r\n",
        body.len()
    );
    w.write_all(head.as_bytes())?;
    if req.method != "HEAD" {
        w.write_all(&body)?
    }
    w.flush()?;
    Ok(keep)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn requests() {
        let raw = b"GET /js/06-game.js?v=2 HTTP/1.1\r\nHost: x\r\nUpgrade: WebSocket\r\nConnection: keep-alive, Upgrade\r\n\r\nGET / HTTP/1.1\r\n\r\n";
        let (mut r, mut buf) = (&raw[..], Vec::new());
        let a = read_request(&mut r, &mut buf).unwrap().unwrap();
        assert_eq!((a.method.as_str(), a.path.as_str(), a.upgrade()), ("GET", "/js/06-game.js", true));
        let b = read_request(&mut r, &mut buf).unwrap().unwrap();
        assert_eq!((b.path.as_str(), b.upgrade()), ("/", false));
        assert!(read_request(&mut r, &mut buf).unwrap().is_none());
    }

    #[test]
    fn files() {
        let f = Files::Baked;
        assert!(f.get("/").is_some_and(|(p, b)| p == "index.html" && b.starts_with(b"<!doctype html>")));
        assert!(f.get("/js/06-game.js").is_some());
        assert!(f.get("/img/maps/dungeon.jpg").is_some());
        for p in ["/../Cargo.toml", "/js/../../server/Cargo.toml", "/%2e%2e/x", "/.git/config", "/nope.js"] {
            assert!(f.get(p).is_none(), "{p}")
        }
        // a folder on disk hands out the same parts only
        let d = Files::Dir(std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".."));
        assert!(d.get("/js/06-game.js").is_some() && d.get("/").is_some());
        for p in ["/server/Cargo.toml", "/package.json", "/tests/net.js", "/README.md"] {
            assert!(d.get(p).is_none(), "{p}")
        }
        assert_eq!(unescape("/a%20b%zz%"), "/a b%zz%");
        assert_eq!(unescape("%e2%98%83 ☃%"), "☃ ☃%");
        assert_eq!(mime("x.JS"), "text/javascript; charset=utf-8");
    }
}

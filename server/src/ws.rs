// ---------- WebSocket (RFC 6455): the handshake and the frames, no more than the game needs ----------
use std::io::{self, Read, Write};

const GUID: &str = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
// the biggest message a client may send; the game's are a few hundred bytes
pub const MAX_MESSAGE: usize = 256 * 1024;

pub fn sha1(data: &[u8]) -> [u8; 20] {
    let mut h: [u32; 5] = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
    let mut msg = data.to_vec();
    let bits = (data.len() as u64).wrapping_mul(8);
    msg.push(0x80);
    while msg.len() % 64 != 56 {
        msg.push(0)
    }
    msg.extend_from_slice(&bits.to_be_bytes());
    for block in msg.chunks(64) {
        let mut w = [0u32; 80];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([block[i * 4], block[i * 4 + 1], block[i * 4 + 2], block[i * 4 + 3]])
        }
        for i in 16..80 {
            w[i] = (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]).rotate_left(1)
        }
        let [mut a, mut b, mut c, mut d, mut e] = h;
        for (i, wi) in w.iter().enumerate() {
            let (f, k) = match i {
                0..=19 => ((b & c) | (!b & d), 0x5A827999),
                20..=39 => (b ^ c ^ d, 0x6ED9EBA1),
                40..=59 => ((b & c) | (b & d) | (c & d), 0x8F1BBCDC),
                _ => (b ^ c ^ d, 0xCA62C1D6),
            };
            let t = a.rotate_left(5).wrapping_add(f).wrapping_add(e).wrapping_add(k).wrapping_add(*wi);
            e = d;
            d = c;
            c = b.rotate_left(30);
            b = a;
            a = t;
        }
        for (x, y) in h.iter_mut().zip([a, b, c, d, e]) {
            *x = x.wrapping_add(y)
        }
    }
    let mut out = [0u8; 20];
    for (i, x) in h.iter().enumerate() {
        out[i * 4..i * 4 + 4].copy_from_slice(&x.to_be_bytes())
    }
    out
}

pub fn base64(data: &[u8]) -> String {
    const A: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut s = String::new();
    for c in data.chunks(3) {
        let n = (c[0] as u32) << 16 | (*c.get(1).unwrap_or(&0) as u32) << 8 | *c.get(2).unwrap_or(&0) as u32;
        for i in 0..4 {
            if i <= c.len() {
                s.push(A[(n >> (18 - 6 * i) & 63) as usize] as char)
            } else {
                s.push('=')
            }
        }
    }
    s
}

// the answer to a client's Sec-WebSocket-Key
pub fn accept_key(key: &str) -> String {
    base64(&sha1(format!("{}{}", key.trim(), GUID).as_bytes()))
}

pub enum Frame {
    Text(String),
    Ping(Vec<u8>),
    Pong,
    Close,
}

// reads whole messages, joining fragments and unmasking. a control frame may come between the fragments of a message:
// it is returned at once and the fragments so far wait in `part` for the rest
pub fn read_message<R: Read>(r: &mut R, part: &mut Option<Vec<u8>>) -> io::Result<Frame> {
    let bad = |m: &str| io::Error::new(io::ErrorKind::InvalidData, m.to_string());
    loop {
        let mut h = [0u8; 2];
        r.read_exact(&mut h)?;
        let (fin, op, masked) = (h[0] & 0x80 != 0, h[0] & 0x0f, h[1] & 0x80 != 0);
        let mut len = (h[1] & 0x7f) as u64;
        if len == 126 {
            let mut b = [0u8; 2];
            r.read_exact(&mut b)?;
            len = u16::from_be_bytes(b) as u64
        } else if len == 127 {
            let mut b = [0u8; 8];
            r.read_exact(&mut b)?;
            len = u64::from_be_bytes(b)
        }
        if !masked {
            return Err(bad("unmasked client frame"));
        }
        if len > MAX_MESSAGE as u64 || part.as_ref().map_or(0, |m| m.len()) + len as usize > MAX_MESSAGE {
            return Err(bad("message too big"));
        }
        if op >= 0x8 && (!fin || len > 125) {
            return Err(bad("bad control frame"));
        }
        let mut mask = [0u8; 4];
        r.read_exact(&mut mask)?;
        let mut data = vec![0u8; len as usize];
        r.read_exact(&mut data)?;
        for (i, b) in data.iter_mut().enumerate() {
            *b ^= mask[i % 4]
        }
        match op {
            0x8 => return Ok(Frame::Close),
            0x9 => return Ok(Frame::Ping(data)),
            0xA => return Ok(Frame::Pong),
            0x1 if part.is_none() => *part = Some(data),
            0x0 if part.is_some() => part.as_mut().unwrap().extend_from_slice(&data),
            0x2 => return Err(bad("binary messages are not used")),
            _ => return Err(bad("unexpected frame")),
        }
        if fin {
            let msg = part.take().unwrap();
            return String::from_utf8(msg).map(Frame::Text).map_err(|_| bad("text is not UTF-8"));
        }
    }
}

// a server frame: never masked, never fragmented
pub fn write_frame<W: Write>(w: &mut W, op: u8, data: &[u8]) -> io::Result<()> {
    let mut f = Vec::with_capacity(data.len() + 10);
    f.push(0x80 | op);
    match data.len() {
        n if n < 126 => f.push(n as u8),
        n if n < 65536 => {
            f.push(126);
            f.extend_from_slice(&(n as u16).to_be_bytes())
        }
        n => {
            f.push(127);
            f.extend_from_slice(&(n as u64).to_be_bytes())
        }
    }
    f.extend_from_slice(data);
    w.write_all(&f)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn digests() {
        let hex = |d: [u8; 20]| d.iter().map(|b| format!("{:02x}", b)).collect::<String>();
        assert_eq!(hex(sha1(b"abc")), "a9993e364706816aba3e25717850c26c9cd0d89d");
        assert_eq!(hex(sha1(b"")), "da39a3ee5e6b4b0d3255bfef95601890afd80709");
        assert_eq!(hex(sha1(&[b'a'; 1000])), "291e9a6c66994949b57ba5e650361e98fc36b1ba");
        assert_eq!(base64(b"f"), "Zg==");
        assert_eq!(base64(b"fo"), "Zm8=");
        assert_eq!(base64(b"foo"), "Zm9v");
        // the example of RFC 6455
        assert_eq!(accept_key("dGhlIHNhbXBsZSBub25jZQ=="), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
    }

    fn client_frame(fin: bool, op: u8, data: &[u8]) -> Vec<u8> {
        let mask = [1u8, 2, 3, 4];
        let mut f = vec![if fin { 0x80 } else { 0 } | op];
        if data.len() < 126 {
            f.push(0x80 | data.len() as u8)
        } else {
            f.push(0x80 | 126);
            f.extend_from_slice(&(data.len() as u16).to_be_bytes())
        }
        f.extend_from_slice(&mask);
        f.extend(data.iter().enumerate().map(|(i, b)| b ^ mask[i % 4]));
        f
    }

    #[test]
    fn frames() {
        let mut s = client_frame(false, 1, b"hel");
        s.extend(client_frame(true, 9, b"p"));
        s.extend(client_frame(true, 0, "lo ☃".as_bytes()));
        let big = "x".repeat(300);
        s.extend(client_frame(true, 1, big.as_bytes()));
        s.extend(client_frame(true, 8, b""));
        let (mut r, mut part) = (&s[..], None);
        assert!(matches!(read_message(&mut r, &mut part), Ok(Frame::Ping(p)) if p == b"p"));
        assert!(matches!(read_message(&mut r, &mut part), Ok(Frame::Text(t)) if t == "hello ☃"));
        assert!(matches!(read_message(&mut r, &mut part), Ok(Frame::Text(t)) if t == big));
        assert!(matches!(read_message(&mut r, &mut part), Ok(Frame::Close)));
        // an unmasked frame, a binary one and a continuation with nothing to continue end the connection
        for f in [vec![0x81, 1, b'x'], client_frame(true, 2, b"x"), client_frame(true, 0, b"x")] {
            assert!(read_message(&mut &f[..], &mut None).is_err())
        }
        let mut out = Vec::new();
        write_frame(&mut out, 1, big.as_bytes()).unwrap();
        assert_eq!(&out[..4], &[0x81, 126, 1, 44]);
    }
}

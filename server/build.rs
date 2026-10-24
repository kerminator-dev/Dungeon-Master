// the game's files (the page, scripts, styles, three.js and the map pictures) are baked into the executable, so the
// server alone is enough: players open its address in a browser and get the very game it was built with
use std::fs;
use std::path::{Path, PathBuf};

const PARTS: [&str; 5] = ["index.html", "css", "js", "lib", "img"];

fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
    let mut list: Vec<_> = fs::read_dir(dir).expect("read game dir").flatten().map(|e| e.path()).collect();
    list.sort();
    for p in list {
        let name = p.file_name().unwrap().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        if p.is_dir() {
            walk(&p, out)
        } else {
            out.push(p)
        }
    }
}

fn main() {
    let game = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("..").canonicalize().unwrap();
    let mut files = Vec::new();
    for part in PARTS {
        let p = game.join(part);
        println!("cargo:rerun-if-changed={}", p.display());
        if p.is_dir() {
            walk(&p, &mut files)
        } else if p.is_file() {
            files.push(p)
        }
    }
    let mut src = String::from("pub static FILES: &[(&str, &[u8])] = &[\n");
    for f in &files {
        let rel = f.strip_prefix(&game).unwrap().to_string_lossy().replace('\\', "/");
        src += &format!("    ({:?}, include_bytes!({:?})),\n", rel, f.to_string_lossy());
    }
    src += "];\n";
    fs::write(PathBuf::from(std::env::var("OUT_DIR").unwrap()).join("files.rs"), src).unwrap();
}

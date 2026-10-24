// ---------- the game room: who plays, which level, what is opened, who is through, what comes next ----------
// the server knows the rules of a run together but nothing of the maze itself: every browser builds the same level from
// the same numbers (seed, map, size, level), so the server hands those out and settles what must happen once only (a
// chest opened by two players at the same moment, the gate). one browser, the host, moves the shadows for everyone.
// a player is not the connection: a connection that drops leaves its player waiting a while (GRACE), and the same
// browser joining again (its token) takes the player up where it was, with the same id
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashMap};
use std::sync::mpsc::Sender;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

// a browser of another version of the game is turned away (js/05n-net.js has the same number)
pub const PROTO: u64 = 2;
// one per cloak colour
pub const MAX_PLAYERS: usize = 6;
// the colour names are the default player names
pub const COLOURS: [&str; MAX_PLAYERS] = ["Crimson", "Ochre", "Teal", "Blue", "Plum", "Linen"];
// players still building the level after this long are not waited for
const GO_WAIT: Duration = Duration::from_secs(20);
// a player whose connection dropped is waited for this long (in the maze, the level is not over without them)
const GRACE: Duration = Duration::from_secs(20);
// a room left empty keeps its run this long (a page reloaded comes back to it), then starts afresh
const EMPTY_KEEP: Duration = Duration::from_secs(60);
const PING_EVERY: Duration = Duration::from_secs(8);
// a player whose game sent nothing this long is away (as one whose game is out of view): the host's shadows may catch them
const AWAY: Duration = Duration::from_secs(2);

pub enum Out {
    Text(String),
    Ping,
    Pong(Vec<u8>),
    Close,
}

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum St {
    Lobby,
    In,
    Ghost,
    Out,
}

impl St {
    fn name(self) -> &'static str {
        match self {
            St::Lobby => "lobby",
            St::In => "in",
            St::Ghost => "ghost",
            St::Out => "out",
        }
    }
}

struct Player {
    id: u32,
    conn: u32,             // its connection (0: dropped, waited for since `gone`)
    gone: Option<Instant>,
    token: String,
    name: String,
    col: usize,
    st: St,
    ready: bool,
    hidden: bool,
    loaded: bool,
    last_s: Option<Instant>, // its latest state on the level under way
}

#[derive(Clone)]
struct Level {
    n: u32,
    seed: u32,
    theme: String,
    size: u32,
    map_next: bool,
    extra: u32,
    key: u32,
    restart: bool,
}

// what a player leaves behind, kept by the token their browser remembers: a page that comes back after the player
// was let go comes back with the same colour, purse and place
#[derive(Default)]
struct Profile {
    name: String,
    col: usize,
    purse: Value,
    st: Option<St>,
    key: u32,
    pos: Value,
}

pub struct Room {
    conns: HashMap<u32, Sender<Out>>,
    players: Vec<Player>, // in the order they joined: the first one with a connection leads
    play: bool,           // a run is on (otherwise the lobby)
    setup: Value,         // the leader's pick: world, map, size and the pool of maps
    lv: Option<Level>,
    opened: BTreeMap<u64, u32>, // container (its index on the level) -> who opened it
    gate: Option<u32>,
    map_buy: Option<u32>, // who bought the next maze's map (it is the team's)
    done: bool,           // nobody left in the maze: the trader
    go: bool,             // everyone has built the level: the shadows may move
    go_by: Option<Instant>,
    host: u32,
    profiles: HashMap<String, Profile>,
    theme: String,
    streak: u32,
    rng: u64,
    empty_since: Option<Instant>,
    next_id: u32,
    next_key: u32,
    last_ping: Instant,
    pub events: Vec<String>, // for the server's window
}

fn clean_name(s: &str) -> Option<String> {
    let s: String = s.chars().filter(|c| !c.is_control()).collect::<String>().split_whitespace().collect::<Vec<_>>().join(" ");
    let s: String = s.chars().take(16).collect();
    (!s.is_empty()).then_some(s)
}

fn word(v: &Value, max: usize) -> Option<String> {
    v.as_str().filter(|s| !s.is_empty() && s.len() <= max && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')).map(String::from)
}

impl Room {
    pub fn new() -> Room {
        let seed = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos() as u64).unwrap_or(7) | 1;
        Room {
            conns: HashMap::new(),
            players: Vec::new(),
            play: false,
            setup: Value::Null,
            lv: None,
            opened: BTreeMap::new(),
            gate: None,
            map_buy: None,
            done: false,
            go: false,
            go_by: None,
            host: 0,
            profiles: HashMap::new(),
            theme: String::new(),
            streak: 0,
            rng: seed,
            empty_since: None,
            next_id: 1,
            next_key: 1,
            last_ping: Instant::now(),
            events: Vec::new(),
        }
    }

    fn rand(&mut self) -> u64 {
        // xorshift64*
        self.rng ^= self.rng >> 12;
        self.rng ^= self.rng << 25;
        self.rng ^= self.rng >> 27;
        self.rng.wrapping_mul(0x2545F4914F6CDD1D)
    }
    fn chance(&mut self) -> f64 {
        (self.rand() >> 11) as f64 / (1u64 << 53) as f64
    }

    // ---------- sending ----------
    fn send_conn(&self, conn: u32, v: &Value) {
        if let Some(tx) = self.conns.get(&conn) {
            let _ = tx.send(Out::Text(v.to_string()));
        }
    }
    fn close_conn(&self, conn: u32) {
        if let Some(tx) = self.conns.get(&conn) {
            let _ = tx.send(Out::Close);
        }
    }
    fn send(&self, id: u32, v: &Value) {
        if let Some(p) = self.player(id) {
            self.send_conn(p.conn, v)
        }
    }
    // to every player with a connection, but `except`
    fn broadcast(&self, v: &Value, except: u32) {
        let s = v.to_string();
        for p in &self.players {
            if p.id != except && p.conn != 0 {
                if let Some(tx) = self.conns.get(&p.conn) {
                    let _ = tx.send(Out::Text(s.clone()));
                }
            }
        }
    }
    fn player(&self, id: u32) -> Option<&Player> {
        self.players.iter().find(|p| p.id == id)
    }
    fn player_mut(&mut self, id: u32) -> Option<&mut Player> {
        self.players.iter_mut().find(|p| p.id == id)
    }
    fn name(&self, id: u32) -> String {
        self.player(id).map_or("?".into(), |p| p.name.clone())
    }
    // the first who joined, of those with a connection
    fn leader(&self) -> u32 {
        self.players.iter().find(|p| p.conn != 0).or(self.players.first()).map_or(0, |p| p.id)
    }

    fn players_json(&self) -> Value {
        Value::Array(
            self.players
                .iter()
                .map(|p| json!({"id":p.id,"name":p.name,"col":p.col,"st":p.st.name(),"ready":p.ready,"hidden":p.hidden,"loaded":p.loaded,"off":p.conn==0}))
                .collect(),
        )
    }
    fn lv_json(&self) -> Value {
        self.lv.as_ref().map_or(Value::Null, |l| {
            json!({"n":l.n,"seed":l.seed,"theme":l.theme,"size":l.size,"mapNext":l.map_next,"extra":l.extra,"key":l.key,"restart":l.restart})
        })
    }
    // the roster, sent whenever someone comes, goes or changes
    fn room_msg(&self) -> Value {
        json!({"t":"room","players":self.players_json(),"leader":self.leader(),"host":self.host,"play":self.play,"done":self.done})
    }
    fn sync(&mut self) {
        self.pick_host();
        let m = self.room_msg();
        self.broadcast(&m, 0)
    }

    // the host moves the shadows: it stays the host while it can (each change hands the shadows over); otherwise the
    // first player with a connection, the level built and the page in view
    fn pick_host(&mut self) {
        let ok = |p: &Player| p.conn != 0 && p.loaded && !p.hidden;
        if self.players.iter().any(|p| p.id == self.host && ok(p)) {
            return;
        }
        let on = |p: &&Player| p.conn != 0;
        let h = self.players.iter().find(|p| ok(p)).or_else(|| self.players.iter().filter(on).find(|p| p.loaded)).map(|p| p.id);
        self.host = match h {
            Some(id) => id,
            None if self.players.iter().any(|p| p.id == self.host && p.conn != 0) => self.host,
            None => self.leader(),
        }
    }

    // ---------- connections ----------
    pub fn connect(&mut self, tx: Sender<Out>) -> u32 {
        let id = self.next_id;
        self.next_id += 1;
        self.conns.insert(id, tx);
        id
    }

    // a connection is gone: its player waits for it to come back (tick lets them go after GRACE)
    pub fn disconnect(&mut self, conn: u32) {
        self.conns.remove(&conn);
        let Some(p) = self.players.iter_mut().find(|p| p.conn == conn) else { return };
        p.conn = 0;
        p.gone = Some(Instant::now());
        let name = p.name.clone();
        self.events.push(format!("{name} lost the connection"));
        if self.players.iter().all(|p| p.conn == 0) {
            self.empty_since = Some(Instant::now());
        }
        self.sync();
        // nobody is waited for to build the level now that it can't
        self.check_go()
    }

    // a player leaves the room: Leave in the game, or a dropped connection not back in time
    fn remove(&mut self, id: u32) {
        let Some(i) = self.players.iter().position(|p| p.id == id) else { return };
        let p = self.players.remove(i);
        let key = self.lv.as_ref().map_or(0, |l| l.key);
        if let Some(pr) = self.profiles.get_mut(&p.token) {
            pr.st = Some(p.st);
            pr.key = key;
        }
        self.events.push(format!("{} left ({}/{})", p.name, self.players.len(), MAX_PLAYERS));
        if self.players.iter().all(|p| p.conn == 0) && self.empty_since.is_none() {
            self.empty_since = Some(Instant::now());
        }
        if self.players.is_empty() {
            return;
        }
        self.sync();
        // the one who left may have been the last in the maze, the last not ready or the last still building
        if self.play {
            self.check_go();
            self.progress();
            self.advance();
        }
    }

    pub fn tick(&mut self, now: Instant) {
        if now.duration_since(self.last_ping) >= PING_EVERY {
            self.last_ping = now;
            for tx in self.conns.values() {
                let _ = tx.send(Out::Ping);
            }
        }
        let late: Vec<u32> = self.players.iter().filter(|p| p.gone.is_some_and(|t| now.duration_since(t) >= GRACE)).map(|p| p.id).collect();
        for id in late {
            self.remove(id)
        }
        if self.play && !self.go && self.players.iter().any(|p| p.conn != 0) && self.go_by.is_some_and(|t| now >= t) {
            self.events.push("Not everyone has built the level: starting without them".into());
            self.start_go()
        }
        if self.players.is_empty() && self.empty_since.is_some_and(|t| now.duration_since(t) >= EMPTY_KEEP) {
            if self.play {
                self.events.push("Everyone left: the run is over".into())
            }
            let (rng, next_id, next_key) = (self.rng, self.next_id, self.next_key);
            let (conns, events) = (std::mem::take(&mut self.conns), std::mem::take(&mut self.events));
            *self = Room { rng, next_id, next_key, conns, events, ..Room::new() };
        }
    }

    // ---------- messages ----------
    pub fn message(&mut self, conn: u32, text: &str) {
        let Ok(v) = serde_json::from_str::<Value>(text) else { return };
        let Some(t) = v.get("t").and_then(|t| t.as_str()) else { return };
        let Some(me) = self.players.iter().find(|p| p.conn == conn) else {
            if t == "hello" {
                self.hello(conn, &v)
            }
            return;
        };
        let (id, st, token) = (me.id, me.st, me.token.clone());
        let leader = self.leader() == id;
        // what a player does on a level carries its key (lk): said just as a new level began, it is not taken for that one
        let here = self.lv.as_ref().is_some_and(|l| v["lk"].as_u64() == Some(l.key as u64));
        match t {
            // the leader's pick in the lobby, shown to the others as it changes
            "setup" if leader && !self.play => {
                let pool: Vec<Value> = v["pool"].as_array().map_or(vec![], |a| a.iter().filter_map(|x| word(x, 24)).take(16).map(Value::from).collect());
                let size = v["size"].as_u64().unwrap_or(12).clamp(6, 30);
                self.setup = json!({"world":word(&v["world"],16),"pick":word(&v["pick"],24),"size":size,"pool":pool});
                let m = json!({"t":"setup","setup":self.setup});
                self.broadcast(&m, id)
            }
            "start" if leader && !self.play => self.start_run(),
            // the leader ends the run: everyone back to the lobby
            "lobby" if leader && self.play => {
                self.play = false;
                self.lv = None;
                self.done = false;
                self.go = false;
                self.map_buy = None;
                self.opened.clear();
                self.gate = None;
                for p in &mut self.players {
                    p.st = St::Lobby;
                    p.ready = false;
                    p.loaded = false;
                }
                self.events.push("The run is over: back to the lobby".into());
                self.broadcast(&json!({"t":"lobby"}), 0);
                self.sync()
            }
            "leave" => self.remove(id),
            "loaded" if self.play => {
                if self.lv.as_ref().is_some_and(|l| v["key"].as_u64() == Some(l.key as u64)) {
                    if let Some(p) = self.player_mut(id) {
                        p.loaded = true
                    }
                    if self.go {
                        self.send(id, &json!({"t":"go"}))
                    }
                    self.sync();
                    self.check_go()
                }
            }
            // a player's own state thirty times a second, and the things they set off (a coin thrown, a lockpick
            // snapping, ...): passed on to the others
            "s" | "fx" if self.play => {
                if t == "s" && here {
                    if let Some(p) = self.player_mut(id) {
                        p.last_s = Some(Instant::now())
                    }
                }
                let mut o = v.as_object().cloned().unwrap_or_default();
                o.insert("id".into(), id.into());
                if t == "s" && st == St::In {
                    let key = self.lv.as_ref().map_or(0, |l| l.key);
                    if let Some(pr) = self.profiles.get_mut(&token) {
                        pr.pos = v.clone();
                        pr.key = key
                    }
                }
                self.broadcast(&Value::Object(o), id)
            }
            // the shadows, from the host only
            "mobs" if self.play && id == self.host => {
                let mut o = v.as_object().cloned().unwrap_or_default();
                o.insert("id".into(), id.into());
                self.broadcast(&Value::Object(o), id)
            }
            // a chest, an urn or a pit: the first to ask gets it
            "open" if self.play && !self.done && st == St::In && here => {
                if let Some(i) = v["i"].as_u64().filter(|i| *i < 100_000) {
                    if !self.opened.contains_key(&i) {
                        self.opened.insert(i, id);
                        self.broadcast(&json!({"t":"opened","i":i,"by":id}), 0)
                    }
                }
            }
            "gate" if self.play && !self.done && st == St::In && here && self.gate.is_none() => {
                self.gate = Some(id);
                self.broadcast(&json!({"t":"gate","by":id}), 0)
            }
            "exit" if self.play && !self.done && st == St::In && here => {
                self.set_st(id, St::Out);
                self.events.push(format!("{} is through the exit", self.name(id)));
                self.sync();
                self.progress()
            }
            // the host's shadows reached a player who is away (their game out of view, or silent a while) where they stand:
            // caught there. only the host says so, and it is taken only of one who is away (a game in play decides its own)
            "catch" if self.play && !self.done && id == self.host && here => {
                let Some(who) = v["who"].as_u64().map(|w| w as u32) else { return };
                let now = Instant::now();
                let away = |p: &Player| p.hidden || p.last_s.is_some_and(|t| now.duration_since(t) >= AWAY);
                if self.player(who).is_some_and(|p| p.st == St::In && p.conn != 0 && away(p)) {
                    self.set_st(who, St::Ghost);
                    self.events.push(format!("{} was caught while away", self.name(who)));
                    self.sync();
                    self.progress()
                }
            }
            "caught" if self.play && !self.done && st == St::In && here => {
                self.set_st(id, St::Ghost);
                self.events.push(format!("{} was caught", self.name(id)));
                self.sync();
                self.progress()
            }
            // the next maze's map is the team's: the first to buy it pays, the others need not
            "mapnext" if self.play && here && self.map_buy.is_none() => {
                self.map_buy = Some(id);
                self.broadcast(&json!({"t":"mapnext","by":id}), 0)
            }
            "ready" if self.play && here => {
                let on = v["on"].as_bool().unwrap_or(true);
                if let Some(p) = self.player_mut(id) {
                    p.ready = on
                }
                self.sync();
                self.advance()
            }
            // the purse, kept for a page that comes back
            "purse" => {
                if v["p"].to_string().len() <= 16384 {
                    if let Some(pr) = self.profiles.get_mut(&token) {
                        pr.purse = v["p"].clone()
                    }
                }
            }
            // a page out of view stops drawing, and so stops moving the shadows: another player takes them over
            "vis" => {
                let h = v["hidden"].as_bool().unwrap_or(false);
                if let Some(p) = self.player_mut(id) {
                    p.hidden = h
                }
                self.sync()
            }
            _ => {}
        }
    }

    fn hello(&mut self, conn: u32, v: &Value) {
        if v["v"].as_u64() != Some(PROTO) {
            self.send_conn(conn, &json!({"t":"error","code":"version","msg":"This server runs another version of the game. Open the game from the address the server shows"}));
            return self.close_conn(conn);
        }
        let token = v["token"].as_str().filter(|s| (8..=64).contains(&s.len()) && s.chars().all(|c| c.is_ascii_alphanumeric())).map(String::from);
        let name = clean_name(v["name"].as_str().unwrap_or(""));
        let play = self.play;
        let key = self.lv.as_ref().map_or(0, |l| l.key);
        // the same player again: back after a dropped connection or a reload, or from a second window (whose
        // connection makes way): the player goes on where it was, with the same id
        if let Some(i) = token.as_ref().and_then(|t| self.players.iter().position(|p| &p.token == t)) {
            let old = self.players[i].conn;
            if old != 0 {
                self.send_conn(old, &json!({"t":"error","code":"replaced","msg":"You joined from another window"}));
                self.close_conn(old);
            }
            let p = &mut self.players[i];
            let (id, back) = (p.id, p.conn == 0);
            p.conn = conn;
            p.gone = None;
            p.hidden = false;
            p.loaded = false;
            p.last_s = None;
            if let Some(n) = name {
                p.name = n
            }
            let (pname, st) = (p.name.clone(), p.st);
            let pr = self.profiles.entry(p.token.clone()).or_default();
            pr.name = pname.clone();
            let purse = if play { pr.purse.clone() } else { Value::Null };
            let pos = if play && st == St::In && pr.key == key { pr.pos.clone() } else { Value::Null };
            let tok = p.token.clone();
            self.empty_since = None;
            self.welcome(conn, id, &tok, purse, pos);
            if back {
                self.events.push(format!("{pname} is back"))
            }
            return self.sync();
        }
        if self.players.len() >= MAX_PLAYERS {
            self.send_conn(conn, &json!({"t":"error","code":"full","msg":format!("The game is full: {} players already", MAX_PLAYERS)}));
            return self.close_conn(conn);
        }
        let token = token.unwrap_or_else(|| format!("{:016x}{:016x}", self.rand(), self.rand()));
        let used: Vec<usize> = self.players.iter().map(|p| p.col).collect();
        let pr = self.profiles.entry(token.clone()).or_default();
        let col = Some(pr.col).filter(|c| !pr.name.is_empty() && !used.contains(c)).unwrap_or_else(|| (0..MAX_PLAYERS).find(|c| !used.contains(c)).unwrap());
        let name = name.or_else(|| (!pr.name.is_empty()).then(|| pr.name.clone())).unwrap_or(COLOURS[col].into());
        // back on the same level after being let go: caught or through the exit as they left it; otherwise into the maze
        // (or the trader, if the level is already done)
        let st = if !play {
            St::Lobby
        } else if self.done {
            St::Out
        } else {
            match pr.st {
                Some(s @ (St::Ghost | St::Out)) if pr.key == key => s,
                _ => St::In,
            }
        };
        pr.name = name.clone();
        pr.col = col;
        let purse = if play { pr.purse.clone() } else { Value::Null };
        let pos = if play && st == St::In && pr.key == key { pr.pos.clone() } else { Value::Null };
        // a new player is known by the number of the connection it came with
        let id = conn;
        self.players.push(Player { id, conn, gone: None, token: token.clone(), name: name.clone(), col, st, ready: false, hidden: false, loaded: false, last_s: None });
        self.empty_since = None;
        self.welcome(conn, id, &token, purse, pos);
        self.events.push(format!("{} joined ({}/{})", name, self.players.len(), MAX_PLAYERS));
        let m = self.room_msg();
        self.broadcast(&m, id)
    }

    // everything a joining page needs: who it is, the room, the level under way and what has happened on it
    fn welcome(&mut self, conn: u32, id: u32, token: &str, purse: Value, pos: Value) {
        self.pick_host();
        let opened: Vec<Value> = self.opened.iter().map(|(i, by)| json!([i, by])).collect();
        let w = json!({"t":"welcome","v":PROTO,"id":id,"token":token,"purse":purse,"pos":pos,"room":{
            "players":self.players_json(),"leader":self.leader(),"host":self.host,"play":self.play,"done":self.done,
            "setup":self.setup,"lv":self.lv_json(),"opened":opened,"gate":self.gate,"mapBuy":self.map_buy,"go":self.go}});
        self.send_conn(conn, &w)
    }

    // ---------- the run ----------
    fn pool(&self) -> Vec<String> {
        self.setup["pool"].as_array().map_or(vec![], |a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
    }

    // the map of the next level, drawn from the pool as the game does alone: a new one each level most of the time,
    // never three of the same in a row
    fn roll_theme(&mut self, first: bool) -> String {
        let pool = self.pool();
        if pool.is_empty() {
            return "dungeon".into();
        }
        if pool.len() == 1 {
            self.streak = 1;
            self.theme = pool[0].clone();
            return self.theme.clone();
        }
        let cur = pool.contains(&self.theme).then(|| self.theme.clone());
        let next = match &cur {
            Some(c) if !first => {
                if self.streak >= 2 || self.chance() < 0.7 {
                    let others: Vec<&String> = pool.iter().filter(|t| *t != c).collect();
                    others[(self.rand() % others.len() as u64) as usize].clone()
                } else {
                    c.clone()
                }
            }
            _ => pool[(self.rand() % pool.len() as u64) as usize].clone(),
        };
        self.streak = if cur.as_ref() == Some(&next) && !first { self.streak + 1 } else { 1 };
        self.theme = next.clone();
        next
    }

    // more players, a shadow or two more
    fn extra_mobs(&self) -> u32 {
        match self.players.len() {
            0 | 1 => 0,
            2 => 1,
            _ => 2,
        }
    }

    fn start_run(&mut self) {
        if self.pool().is_empty() {
            return;
        }
        self.play = true;
        self.map_buy = None;
        // a new run: everyone starts with an empty purse
        for p in self.profiles.values_mut() {
            p.purse = Value::Null;
            p.pos = Value::Null;
            p.st = None
        }
        let theme = self.roll_theme(true);
        let lv = Level { n: 1, seed: (self.rand() % 1_000_000) as u32, theme, size: self.setup["size"].as_u64().unwrap_or(12) as u32, map_next: false, extra: self.extra_mobs(), key: 0, restart: false };
        self.new_level(lv)
    }

    fn new_level(&mut self, mut lv: Level) {
        lv.key = self.next_key;
        self.next_key += 1;
        self.events.push(if lv.restart {
            format!("Everyone was caught: level {} starts over", lv.n)
        } else {
            format!("Level {} · {} · seed {}", lv.n, lv.theme, lv.seed)
        });
        self.lv = Some(lv);
        self.opened.clear();
        self.gate = None;
        self.done = false;
        self.go = false;
        self.go_by = Some(Instant::now() + GO_WAIT);
        for p in &mut self.players {
            p.st = St::In;
            p.ready = false;
            p.loaded = false;
            p.last_s = None
        }
        let m = json!({"t":"level","lv":self.lv_json()});
        self.broadcast(&m, 0);
        self.sync()
    }

    fn set_st(&mut self, id: u32, st: St) {
        if let Some(p) = self.player_mut(id) {
            p.st = st;
            p.ready = false
        }
    }

    // the shadows move once everyone with a connection has built the level
    fn check_go(&mut self) {
        let on: Vec<&Player> = self.players.iter().filter(|p| p.conn != 0).collect();
        if self.play && !self.go && !on.is_empty() && on.iter().all(|p| p.loaded) {
            self.start_go()
        }
    }
    fn start_go(&mut self) {
        self.go = true;
        self.broadcast(&json!({"t":"go"}), 0)
    }

    // nobody left in the maze: the level is done if anyone got through, and starts over if everyone was caught.
    // a player whose connection dropped counts as they were
    fn progress(&mut self) {
        if !self.play || self.done || self.players.is_empty() || self.players.iter().any(|p| p.st == St::In) {
            return;
        }
        if self.players.iter().any(|p| p.st == St::Out) {
            self.done = true;
            for p in &mut self.players {
                p.st = St::Out
            }
            self.events.push(format!("Level {} cleared", self.lv.as_ref().map_or(0, |l| l.n)));
            self.broadcast(&json!({"t":"done"}), 0);
            self.sync();
            self.advance()
        } else if let Some(mut lv) = self.lv.clone() {
            lv.restart = true;
            self.new_level(lv)
        }
    }

    // everyone at the trader and ready: the next level
    fn advance(&mut self) {
        if !self.play || !self.done || self.players.is_empty() || !self.players.iter().all(|p| p.ready) {
            return;
        }
        let Some(old) = self.lv.clone() else { return };
        let theme = self.roll_theme(false);
        let lv = Level { n: old.n + 1, seed: (self.rand() % 1_000_000) as u32, theme, size: old.size, map_next: self.map_buy.take().is_some(), extra: self.extra_mobs(), key: 0, restart: false };
        self.new_level(lv)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc::{channel, Receiver};

    // a page: its connection, and the player id the server gave it
    struct Client {
        conn: u32,
        id: u32,
        rx: Receiver<Out>,
    }
    impl Client {
        // every message since the last call
        fn all(&self) -> Vec<Value> {
            self.rx.try_iter().filter_map(|o| if let Out::Text(t) = o { serde_json::from_str(&t).ok() } else { None }).collect()
        }
        fn last(&self, t: &str) -> Option<Value> {
            self.all().into_iter().filter(|m| m["t"] == t).last()
        }
    }
    fn join(r: &mut Room, name: &str, token: Option<&str>) -> (Client, Value) {
        let (tx, rx) = channel();
        let conn = r.connect(tx);
        r.message(conn, &json!({"t":"hello","v":PROTO,"name":name,"token":token}).to_string());
        let mut c = Client { conn, id: 0, rx };
        let w = c.last("welcome").unwrap_or(Value::Null);
        c.id = w["id"].as_u64().unwrap_or(0) as u32;
        (c, w)
    }
    // as the game sends them: with the key of the level under way
    fn say(r: &mut Room, c: &Client, mut v: Value) {
        if let (Some(l), Some(o)) = (r.lv.as_ref(), v.as_object_mut()) {
            o.entry("lk").or_insert(json!(l.key));
        }
        r.message(c.conn, &v.to_string())
    }
    fn st(r: &Room, c: &Client) -> St {
        r.player(c.id).unwrap().st
    }
    fn start(r: &mut Room, a: &Client, pool: &[&str]) -> Value {
        say(r, a, json!({"t":"setup","world":"underground","pick":null,"size":8,"pool":pool}));
        say(r, a, json!({"t":"start"}));
        a.last("level").unwrap()["lv"].clone()
    }
    fn load_all(r: &mut Room, cs: &[&Client]) {
        let key = r.lv.as_ref().unwrap().key;
        for c in cs {
            say(r, c, json!({"t":"loaded","key":key}))
        }
    }

    #[test]
    fn lobby_and_start() {
        let mut r = Room::new();
        let (a, wa) = join(&mut r, "  Ann\u{7} \n ", None);
        assert_eq!(wa["room"]["players"][0]["name"], "Ann");
        assert_eq!(wa["room"]["leader"], a.id);
        let (b, wb) = join(&mut r, "", None);
        // no name given: the colour's
        assert_eq!(wb["room"]["players"][1]["name"], COLOURS[1]);
        assert_ne!(wa["token"], wb["token"]);
        // only the leader picks and starts; the others see the pick
        say(&mut r, &b, json!({"t":"start"}));
        assert!(!r.play);
        say(&mut r, &a, json!({"t":"setup","world":"underground","size":99,"pool":["dungeon","catacombs","../x",5]}));
        assert_eq!(b.last("setup").unwrap()["setup"], json!({"world":"underground","pick":null,"size":30,"pool":["dungeon","catacombs"]}));
        say(&mut r, &a, json!({"t":"start"}));
        let lv = b.last("level").unwrap()["lv"].clone();
        assert_eq!((lv["n"].as_u64(), lv["extra"].as_u64(), lv["size"].as_u64()), (Some(1), Some(1), Some(30)));
        assert!(["dungeon", "catacombs"].contains(&lv["theme"].as_str().unwrap()));
        // the shadows wait until both have built the level
        say(&mut r, &a, json!({"t":"loaded","key":lv["key"]}));
        assert!(!r.go);
        say(&mut r, &b, json!({"t":"loaded","key":lv["key"]}));
        assert!(r.go && a.last("go").is_some());
    }

    #[test]
    fn claims_relay_and_host() {
        let mut r = Room::new();
        let (a, _) = join(&mut r, "A", None);
        let (b, _) = join(&mut r, "B", None);
        start(&mut r, &a, &["dungeon"]);
        load_all(&mut r, &[&a, &b]);
        a.all();
        b.all();
        // two players at one chest: the first gets it, both see who
        say(&mut r, &b, json!({"t":"open","i":3}));
        say(&mut r, &a, json!({"t":"open","i":3}));
        let (ma, mb) = (a.all(), b.all());
        let opened = |m: &Vec<Value>| m.iter().filter(|x| x["t"] == "opened").cloned().collect::<Vec<_>>();
        assert_eq!(opened(&ma), vec![json!({"t":"opened","i":3,"by":b.id})]);
        assert_eq!(opened(&mb).len(), 1);
        // states go to the others with the sender's id; shadows only from the host
        say(&mut r, &a, json!({"t":"s","x":1.5}));
        let sb = b.last("s").unwrap();
        assert_eq!((sb["x"].clone(), sb["id"].clone()), (json!(1.5), json!(a.id)));
        assert!(a.last("s").is_none());
        assert_eq!(r.host, a.id);
        say(&mut r, &b, json!({"t":"mobs","m":[]}));
        assert!(a.last("mobs").is_none());
        // the host's page goes out of view: the other one takes the shadows over
        say(&mut r, &a, json!({"t":"vis","hidden":true}));
        assert_eq!(b.last("room").unwrap()["host"], b.id);
        say(&mut r, &b, json!({"t":"mobs","m":[]}));
        assert!(a.last("mobs").is_some());
    }

    #[test]
    fn caught_exit_trader_and_next() {
        let mut r = Room::new();
        let (a, _) = join(&mut r, "A", None);
        let (b, _) = join(&mut r, "B", None);
        let lv1 = start(&mut r, &a, &["dungeon", "catacombs", "cistern"]);
        load_all(&mut r, &[&a, &b]);
        say(&mut r, &a, json!({"t":"caught"}));
        assert_eq!(st(&r, &a), St::Ghost);
        assert!(!r.done);
        // one through the exit, the other caught: the level is done, both trade
        say(&mut r, &b, json!({"t":"mapnext"}));
        say(&mut r, &a, json!({"t":"mapnext"}));
        assert_eq!(r.map_buy, Some(b.id));
        say(&mut r, &b, json!({"t":"exit"}));
        assert!(r.done && a.last("done").is_some());
        assert_eq!((st(&r, &a), st(&r, &b)), (St::Out, St::Out));
        say(&mut r, &a, json!({"t":"ready","on":true}));
        assert_eq!(r.lv.as_ref().unwrap().n, 1);
        say(&mut r, &b, json!({"t":"ready","on":true}));
        let lv2 = a.last("level").unwrap()["lv"].clone();
        assert_eq!(lv2["n"], 2);
        assert_eq!(lv2["mapNext"], true);
        assert_ne!(lv2["key"], lv1["key"]);
        assert_eq!((st(&r, &a), st(&r, &b), r.done, r.go), (St::In, St::In, false, false));
        // said on the last level (a late word), not taken for this one
        for t in ["caught", "exit", "ready", "mapnext"] {
            say(&mut r, &a, json!({"t":t,"lk":lv1["key"]}));
        }
        say(&mut r, &b, json!({"t":"open","i":1,"lk":lv1["key"]}));
        assert!(st(&r, &a) == St::In && !r.player(a.id).unwrap().ready && r.map_buy.is_none() && r.opened.is_empty());
        // everyone caught: the same level once more
        load_all(&mut r, &[&a, &b]);
        say(&mut r, &a, json!({"t":"caught"}));
        say(&mut r, &b, json!({"t":"caught"}));
        let again = b.last("level").unwrap()["lv"].clone();
        assert_eq!((again["n"].clone(), again["seed"].clone(), again["theme"].clone(), again["restart"].clone()), (lv2["n"].clone(), lv2["seed"].clone(), lv2["theme"].clone(), json!(true)));
        assert!(r.opened.is_empty());
    }

    // a page says again what it did while its connection was down (caught, through): said twice, it counts once
    #[test]
    fn said_again_counts_once() {
        let mut r = Room::new();
        let (a, _) = join(&mut r, "A", None);
        let (b, _) = join(&mut r, "B", None);
        start(&mut r, &a, &["dungeon"]);
        load_all(&mut r, &[&a, &b]);
        let key = r.lv.as_ref().unwrap().key;
        say(&mut r, &a, json!({"t":"caught"}));
        say(&mut r, &a, json!({"t":"caught"}));
        assert_eq!((st(&r, &a), r.lv.as_ref().unwrap().key, r.done), (St::Ghost, key, false));
        say(&mut r, &b, json!({"t":"exit"}));
        assert!(r.done);
        // the level is over: nothing said again moves anyone back or starts anything
        say(&mut r, &b, json!({"t":"exit"}));
        say(&mut r, &a, json!({"t":"caught"}));
        assert_eq!((st(&r, &a), st(&r, &b), r.lv.as_ref().unwrap().key), (St::Out, St::Out, key));
    }

    // a player whose game is out of view (or silent) is caught where they stand when the host's shadows reach them; one in
    // play is not (their own game decides), and only the host may say it
    #[test]
    fn caught_while_away() {
        let mut r = Room::new();
        let (a, _) = join(&mut r, "A", None);
        let (b, _) = join(&mut r, "B", None);
        let (c, _) = join(&mut r, "C", None);
        start(&mut r, &a, &["dungeon"]);
        load_all(&mut r, &[&a, &b, &c]);
        assert_eq!(r.host, a.id);
        say(&mut r, &b, json!({"t":"s","x":1,"z":1}));
        say(&mut r, &a, json!({"t":"catch","who":b.id}));
        assert_eq!(st(&r, &b), St::In);
        // B's game goes out of view: the host's word is taken, another's is not
        say(&mut r, &b, json!({"t":"vis","hidden":true}));
        say(&mut r, &c, json!({"t":"catch","who":b.id}));
        assert_eq!(st(&r, &b), St::In);
        say(&mut r, &a, json!({"t":"catch","who":b.id}));
        assert!(st(&r, &b) == St::Ghost && r.events.iter().any(|e| e.contains("B was caught while away")));
        // C's game is in view but has sent nothing for a while: away too
        say(&mut r, &c, json!({"t":"s","x":2,"z":2}));
        say(&mut r, &a, json!({"t":"catch","who":c.id}));
        assert_eq!(st(&r, &c), St::In);
        let i = r.players.iter().position(|p| p.id == c.id).unwrap();
        r.players[i].last_s = Some(Instant::now() - AWAY);
        say(&mut r, &a, json!({"t":"catch","who":c.id}));
        assert_eq!(st(&r, &c), St::Ghost);
        // said on the last level, not taken for the next
        let lk = r.lv.as_ref().unwrap().key;
        say(&mut r, &a, json!({"t":"caught"}));
        assert!(r.lv.as_ref().unwrap().restart && r.lv.as_ref().unwrap().key != lk);
        load_all(&mut r, &[&a, &b, &c]);
        say(&mut r, &b, json!({"t":"vis","hidden":true}));
        say(&mut r, &a, json!({"t":"catch","who":b.id,"lk":lk}));
        assert_eq!(st(&r, &b), St::In);
    }

    #[test]
    fn theme_roll_like_the_game() {
        let mut r = Room::new();
        r.setup = json!({"pool":["a","b"]});
        let mut runs = 0;
        let mut prev = r.roll_theme(true);
        let mut n = 1;
        for _ in 0..2000 {
            let t = r.roll_theme(false);
            n = if t == prev { n + 1 } else { 1 };
            runs = runs.max(n);
            prev = t
        }
        assert!(runs <= 2, "never three in a row: {runs}");
        r.setup = json!({"pool":["only"]});
        assert_eq!(r.roll_theme(false), "only");
    }

    #[test]
    fn a_dropped_connection_is_waited_for() {
        let mut r = Room::new();
        let (a, _) = join(&mut r, "A", None);
        let (b, wb) = join(&mut r, "Bob", None);
        let tok = wb["token"].as_str().unwrap().to_string();
        start(&mut r, &a, &["dungeon"]);
        load_all(&mut r, &[&a, &b]);
        say(&mut r, &a, json!({"t":"exit"}));
        // Bob, the last one in the maze, loses the connection: the level is not over without him, and he is shown as gone
        r.disconnect(b.conn);
        assert!(!r.done && a.last("room").unwrap()["players"][1]["off"] == true);
        // he comes back: the same player, still in the maze, gets through
        let (b2, w) = join(&mut r, "", Some(&tok));
        assert_eq!((b2.id, w["room"]["players"][1]["name"].clone(), st(&r, &b2)), (b.id, json!("Bob"), St::In));
        say(&mut r, &b2, json!({"t":"exit"}));
        assert!(r.done);
        // gone for good: after a while he is let go, and the rest goes on without him
        say(&mut r, &a, json!({"t":"ready","on":true}));
        r.disconnect(b2.conn);
        r.tick(Instant::now());
        assert_eq!(r.lv.as_ref().unwrap().n, 1);
        r.tick(Instant::now() + GRACE);
        assert_eq!((r.players.len(), r.lv.as_ref().unwrap().n), (1, 2));
    }

    #[test]
    fn leaving_and_coming_back() {
        let mut r = Room::new();
        let (a, _) = join(&mut r, "A", None);
        let (b, wb) = join(&mut r, "Bob", None);
        let tok = wb["token"].as_str().unwrap().to_string();
        start(&mut r, &a, &["dungeon"]);
        load_all(&mut r, &[&a, &b]);
        say(&mut r, &b, json!({"t":"purse","p":{"gold":42}}));
        say(&mut r, &b, json!({"t":"caught"}));
        // Bob's page reloads: the same player, colour and purse, still a ghost on this level
        r.disconnect(b.conn);
        let (b2, w) = join(&mut r, "", Some(&tok));
        assert_eq!(w["room"]["players"][1]["name"], "Bob");
        assert_eq!((w["purse"].clone(), w["pos"].clone()), (json!({"gold":42}), Value::Null));
        assert_eq!((b2.id, st(&r, &b2), r.player(b2.id).unwrap().col), (b.id, St::Ghost, 1));
        // the leader leaves (Leave in the game): Bob leads and hosts; nobody is left in the maze and nobody got through:
        // the level starts over
        let key = r.lv.as_ref().unwrap().key;
        say(&mut r, &a, json!({"t":"leave"}));
        assert_eq!((r.leader(), r.host), (b2.id, b2.id));
        assert!(r.lv.as_ref().is_some_and(|l| l.key != key && l.restart));
        assert_eq!(st(&r, &b2), St::In);
        // let go while in the maze: back at the same spot
        say(&mut r, &b2, json!({"t":"s","x":3,"z":4}));
        say(&mut r, &b2, json!({"t":"leave"}));
        assert!(r.players.is_empty());
        let (b3, w3) = join(&mut r, "", Some(&tok));
        assert_eq!((w3["pos"]["x"].clone(), st(&r, &b3), w3["room"]["players"][0]["name"].clone()), (json!(3), St::In, json!("Bob")));
        // a second window with the same token takes the player over
        let (b4, w4) = join(&mut r, "", Some(&tok));
        assert!(b3.all().iter().any(|m| m["code"] == "replaced"));
        assert_eq!((w4["room"]["players"].as_array().unwrap().len(), b4.id), (1, b3.id));
        // the game holds six
        for k in 0..5 {
            join(&mut r, &format!("P{k}"), None);
        }
        let (_, full) = join(&mut r, "late", None);
        assert_eq!(full, Value::Null);
        assert_eq!(r.players.len(), MAX_PLAYERS);
        // everyone gone: the run is kept a while for a reload, then the room starts afresh
        let conns: Vec<u32> = r.players.iter().map(|p| p.conn).collect();
        for c in conns {
            r.disconnect(c)
        }
        r.tick(Instant::now() + GRACE);
        assert!(r.play && r.players.is_empty());
        r.tick(Instant::now() + GRACE + EMPTY_KEEP);
        assert!(!r.play && r.profiles.is_empty() && r.events.iter().any(|e| e.contains("run is over")));
    }

    #[test]
    fn garbage_is_ignored() {
        let mut r = Room::new();
        let (a, _) = join(&mut r, "A", None);
        for s in ["", "{", "[]", "null", "{\"t\":5}", "{\"t\":\"open\",\"i\":-1}", "{\"t\":\"hello\"}", "{\"t\":\"setup\",\"pool\":{}}", "{\"t\":\"ready\",\"on\":\"x\"}"] {
            r.message(a.conn, s)
        }
        // a wrong version is turned away
        let (tx, rx) = channel();
        let conn = r.connect(tx);
        r.message(conn, &json!({"t":"hello","v":0}).to_string());
        assert!(rx.try_iter().any(|o| matches!(o, Out::Text(t) if t.contains("version"))));
        assert_eq!(r.players.len(), 1);
    }
}

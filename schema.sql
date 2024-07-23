CREATE TABLE IF NOT EXISTS Metadata (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Post (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    tags TEXT NOT NULL,
    content TEXT NOT NULL,
    blocks TEXT NOT NULL,
    is_draft INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    deleted_at DATETIME
);

INSERT OR IGNORE INTO Metadata (id, name, value)
VALUES
    ("438c16c7-07a7-49d1-9774-afd0d0837e73", "blog_name", "Hanchin Hsieh"),
    ("2ebc7388-f18b-4488-b22b-e51dfc30ccad", "blog_desc", "AKA yuchanns. I'm a developer passionate about FOSS, and a big Fan of LiSA(織部 里沙). You can ask me about Go, CloudNative, Nvim, and Asahi Linux. I have a set of beautiful [dotfiles](https://github.com/yuchanns/dotfiles)."),
    ("82270960-abb1-494e-8657-230a6cda5cae", "blog_avatar", "https://avatars.githubusercontent.com/u/25029451?v=4");


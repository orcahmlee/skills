# skills

個人 agent skills 的 source of truth。每個 skill 住在 `skills/<name>/`，安裝到本機一律走 `npx skills@latest add`，讓 skills CLI 管理安裝的副本。

## Layout

- `skills/<name>/SKILL.md`：自己寫的 skill，唯一該編輯的地方；旁邊的 `agents/openai.yaml` 是跟 vendored skills 相同形狀的 metadata sidecar。
- `.agents/skills/`、`.claude/skills/`：從 `mattpocock/skills` vendor 進來的 skills，來源記在 `skills-lock.json`，用 `npx skills@latest update` 更新，不在這裡改。
- `docs/agents/`：這個 repo 的 issue tracker、triage labels、domain docs 慣例，給 agent 讀。

## 安裝到本機

Skills CLI 從 GitHub 上的這個 repo 抓，所以新的或改過的 skill 要先 push 才裝得到：

```sh
npx skills@latest add orcahmlee/skills -s <name> -g   # 裝一個
npx skills@latest add orcahmlee/skills -s '*' -g      # 新機器：全部裝
npx skills@latest update -g                            # 之後更新
```

裝好的檔案在 `~/.agents/skills/<name>/`，`~/.claude/skills/<name>` 是指過去的 symlink，來源記在 `~/.agents/.skill-lock.json`。手動 copy 進去的副本不在 lock 裡，`update` 看不到它，而且會跟這裡的版本 drift；`commit` 就這樣 drift 過一次。

## 新增一個 skill

1. 在 `skills/<name>/` 寫 `SKILL.md`，照 `writing-for-agents` 的規則。
2. Commit、push。
3. 用上面的 `add` 指令裝到本機。

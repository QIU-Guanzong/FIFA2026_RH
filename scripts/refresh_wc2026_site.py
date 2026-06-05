#!/usr/bin/env python
"""基于最新模型重新生成 `site/index.html` 的动态数值区。"""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

from wcpredict.registry import ModelStore
from wcpredict.tournament import TournamentSimulator, snake_draw_groups
from wcpredict.tournament.wc2026 import (
    GROUPS_2026,
    KNOCKOUT_TREE,
    QF_MATCHES,
    R16_MATCHES,
    R32_MATCHES,
    SF_MATCHES,
    SLOT_ORDER,
    OfficialWC2026Simulator,
)


def _escape_html(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _pct(v: float) -> str:
    return f"{v:.0%}"


def _build_champion_rows(probs) -> str:
    top = probs.sort_values("champion", ascending=False).head(16)
    if top.empty:
        return '<tr><td class="team" colspan="5">暂无可用结果，请先完成训练。</td></tr>'

    top_champ = float(top.iloc[0]["champion"])
    rows: list[str] = []
    for i, (team, row) in enumerate(top.iterrows(), 1):
        width = 0.0 if top_champ <= 0 else float(row["champion"]) / top_champ * 100.0
        width = max(1e-6, min(100.0, width))
        row_class = "top1" if i == 1 else ""
        bar_cls = " gold" if i == 1 else ""
        champion = float(row["champion"]) * 100
        reach_qf = float(row["reach_QF"]) * 100 if "reach_QF" in row.index else 0.0
        reach_final = float(row["reach_Final"]) * 100 if "reach_Final" in row.index else 0.0
        advance = float(row["advance"]) * 100 if "advance" in row.index else 0.0
        rows.append(
            f'<tr class="{row_class}"><td class="team"><span class="rank">{i}</span><b>'
            f'{_escape_html(team)}</b></td><td class="bar-cell"><div class="bar{bar_cls}"><i '
            f'style="width:{width:.1f}%"></i><span>{champion:.1f}%</span></div></td>'
            f'<td class="num hide-sm">{reach_qf:.1f}%</td>'
            f'<td class="num hide-sm">{reach_final:.1f}%</td>'
            f'<td class="num">{advance:.0f}%</td></tr>'
        )
    return "\n".join(rows)


def _build_group_cards(probs) -> str:
    cards: list[str] = []
    for group, members in GROUPS_2026.items():
        team_rows = [t for t in members if t in probs.index]
        sub = probs.loc[team_rows]
        if sub.empty:
            continue
        winner = sub.sort_values("win_group", ascending=False).iloc[0]
        winner_team = winner.name

        second = sub.drop(winner.name)
        second_team = second.sort_values("advance", ascending=False).iloc[0] if len(second) else winner
        second_team_name = second_team.name

        cards.append(
            f'<div class="gcard"><div class="gl">组 {group}</div>'
            f'<div class="row"><span class="nm">{_escape_html(winner_team)}</span>'
            f'<span class="pc">头名 {_pct(float(winner["win_group"]) )} · 出线 {_pct(float(winner["advance"]) )}</span></div>'
            f'<div class="row second"><span class="nm">{_escape_html(second_team_name)}</span>'
            f'<span class="pc">出线 {_pct(float(second_team["advance"]) )}</span></div></div>'
        )
    return "\n".join(cards)


def _slot_label(spec) -> str:
    kind, arg = spec
    if kind == "W":
        return f"{arg} 组头名"
    if kind == "R":
        return f"{arg} 组次名"
    groups = "/".join(sorted(arg))
    return f"最佳第三 {groups}"


def _build_match_card(match_no: int, title: str, entrants: tuple[str, str],
                      row: int, span: int, final: bool = False) -> str:
    final_cls = " final-match" if final else ""
    return (
        f'<article class="match-card{final_cls}" style="--row:{row};--span:{span}" '
        f'aria-label="{_escape_html(title)}">'
        f'<div class="mno">{_escape_html(title)}</div>'
        f'<div class="slot">{_escape_html(entrants[0])}</div>'
        f'<div class="slot">{_escape_html(entrants[1])}</div>'
        "</article>"
    )


def _build_knockout_bracket() -> str:
    rounds: list[tuple[str, list[int], int]] = [
        ("R32", list(R32_MATCHES), 1),
        ("R16", R16_MATCHES, 2),
        ("QF", QF_MATCHES, 4),
        ("SF", SF_MATCHES, 8),
        ("Final", [104], 16),
    ]
    round_labels = {
        "R32": "32 强",
        "R16": "16 强",
        "QF": "1/4 决赛",
        "SF": "半决赛",
        "Final": "决赛",
    }

    columns: list[str] = []
    for round_key, matches, span in rounds:
        cards: list[str] = []
        for idx, match_no in enumerate(matches):
            row = idx * span + 1
            if round_key == "R32":
                s1, s2 = R32_MATCHES[match_no]
                entrants = (_slot_label(s1), _slot_label(s2))
            else:
                upstream = KNOCKOUT_TREE[match_no]
                entrants = (f"胜 {upstream[0]}", f"胜 {upstream[1]}")
            title = f"M{match_no}"
            cards.append(_build_match_card(match_no, title, entrants, row, span, final=(match_no == 104)))

        columns.append(
            f'<div class="br-round">'
            f'<div class="br-title">{_escape_html(round_labels[round_key])}</div>'
            f'<div class="br-lane">{"".join(cards)}</div>'
            f'</div>'
        )

    slot_hint = " / ".join(f"M{m}" for m in SLOT_ORDER)
    return (
        '<div class="bracket" role="img" aria-label="2026 世界杯官方淘汰赛树形路径图">'
        + "".join(columns)
        + "</div>"
        + f'<p class="dim path-note">第三名槽位：{_escape_html(slot_hint)}。'
        "卡片中的“最佳第三 A/B/…”表示该槽位允许接入的组集合，实际每届模拟按 8 个最好第三名做合法匹配。</p>"
    )


def _load_simulation(model_name: str, version: int | None, sims: int, seed: int):
    store = ModelStore()
    loaded = store.load(model_name, version)
    teams = loaded.params.teams
    if len(teams) < 48:
        raise RuntimeError(f"模型可用球队不足：{len(teams)} 队，需 ≥48 队。请先训练 wc2026 官方模型。")

    meta_format = str(loaded.metadata.get("format", "seeded_top48"))
    if meta_format == "wc2026_official":
        sim = OfficialWC2026Simulator(loaded.params)
        probs = sim.run(n_sims=sims, seed=seed).probs
    else:
        strength = {
            team: float(loaded.params.attack[idx] - loaded.params.defence[idx])
            for idx, team in enumerate(teams)
        }
        ranked = [t for t, _ in sorted(strength.items(), key=lambda kv: kv[1], reverse=True)[:48]]
        groups = snake_draw_groups(ranked)
        probs = TournamentSimulator(loaded.params, groups).run(n_sims=sims, seed=seed).probs

    return loaded, probs


def main() -> int:
    parser = argparse.ArgumentParser(description="更新 site/index.html 的动态数值")
    parser.add_argument("--model", default="default", help="模型仓名称")
    parser.add_argument("--version", type=int, default=None, help="模型版本")
    parser.add_argument("--sims", type=int, default=40000, help="模拟次数")
    parser.add_argument("--seed", type=int, default=2026, help="蒙特卡洛随机种子")
    parser.add_argument("--template", type=Path, default=Path("site/index.template.html"),
                        help="站点模板（推荐保留 {{...}} 占位符）")
    parser.add_argument("--output", type=Path, default=Path("site/index.html"),
                        help="重建后的输出文件")
    args = parser.parse_args()

    model, probs = _load_simulation(args.model, args.version, args.sims, args.seed)
    template_path = args.template.expanduser().resolve()
    out = args.output.expanduser().resolve() if args.output else template_path

    template = template_path.read_text(encoding="utf-8")
    generated_at = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %z")
    fit_time = str(model.metadata.get("fit_time", ""))
    data_cutoff = datetime.now().astimezone().date().isoformat()
    if fit_time:
        try:
            data_cutoff = datetime.fromisoformat(fit_time.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            pass

    html = template
    html = html.replace("{{DATA_CUTOFF}}", data_cutoff)
    html = html.replace("{{SIMULATIONS}}", f"{args.sims:,}")
    html = html.replace("{{GENERATED_AT}}", generated_at)
    html = html.replace("{{CHAMPION_TABLE_ROWS}}", _build_champion_rows(probs))
    html = html.replace("{{GROUP_CARDS}}", _build_group_cards(probs))
    html = html.replace("{{KNOCKOUT_BRACKET}}", _build_knockout_bracket())

    out.write_text(html, encoding="utf-8")
    print(f"✓ 已更新 {out}（模型：{model.name} v{model.version}）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

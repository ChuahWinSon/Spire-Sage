"""
Spire Sage — Flask Backend (OpenRouter version)
Uses OpenRouter free models instead of OpenAI paid API.
"""

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__, static_folder="static")
CORS(app)

# ─────────────────────────────────────────────
#  OPENROUTER CLIENT (IMPORTANT CHANGE)
# ─────────────────────────────────────────────

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY")
)

# ─────────────────────────────────────────────
#  SYSTEM PROMPT
# ─────────────────────────────────────────────

SYSTEM_PROMPT = """
You are an expert Slay the Spire deck-building advisor with deep knowledge of every card, relic, and synergy in the game.

Your job is to evaluate a player's current deck and a set of card choices, then decide whether to pick a card or skip.

Core Principles:

- A strong deck needs damage, block, scaling, and draw — but avoid redundancy.
- Deck size matters. Larger decks are less consistent.
- Every card added is a downside unless it clearly improves the deck.
- Avoid short-term thinking that causes long-term deck bloat.

Decision Rules:

- Default action is SKIP.
- Only pick a card if it is clearly strong, necessary, or highly synergistic.
- If unsure, SKIP.

- Before choosing:
  - Compare each card to SKIP.
  - Only pick a card if it is clearly better than skipping.
  - If none are clearly better, SKIP.

- Only pick top-tier or highly impactful cards.
- Average or situational cards should usually be skipped.

Game Phase Strategy:

- Act 1:
  - Prioritize strong standalone cards to survive early fights.
  - Improve damage and block efficiently.
  - Avoid taking too many cards.

- Act 2:
  - Focus on scaling and meaningful synergies.
  - Build toward a clear strategy.

- Act 3:
  - Avoid adding new cards unless extremely strong.
  - Focus on consistency and upgrades.

Additional Factors:

- Consider relic synergies.
- Consider boss matchups.
- Avoid adding cards that dilute existing synergies.

Response Rules:

- Keep responses concise but informative (roughly 10–20 words max).
- Always include a short reason for the decision.
- Do not guess or invent information.

Output Format (MANDATORY):

- PICK: <card name> — <short reason>
- SKIP — <short reason>

"""

# ─────────────────────────────────────────────
#  MESSAGE BUILDER
# ─────────────────────────────────────────────

def build_user_message(deck: list, upcoming: list, floor: int = 1, relics: list = None, boss: str = None) -> str:
    def fmt(cards):
        if not cards:
            return "  (none)"
        lines = []
        for c in cards:
            upgraded = " +" if c.get("upgraded") else ""
            desc = c.get("Description", "")
            lines.append(
                f"  - {c['Name']}{upgraded} "
                f"[{c['Type']}, {c['Rarity']}, Cost {c.get('Cost','?')}]: {desc}"
            )
        return "\n".join(lines)

    def fmt_relics(r_list):
        if not r_list:
            return "  (none)"
        return "\n".join(f"  - {r['Name']}: {r.get('Description', '')}" for r in r_list)

    act = "Act I" if floor <= 17 else "Act II" if floor <= 34 else "Act III" if floor <= 51 else "Act IV"
    relic_section = f"\nCURRENT RELICS ({len(relics or [])} relics):\n{fmt_relics(relics or [])}" if relics else ""
    boss_section = f"\nUPCOMING BOSS: {boss}" if boss else ""

    return f"""
CURRENT FLOOR: {floor} ({act}){boss_section}{relic_section}

CURRENT DECK ({len(deck)} cards):
{fmt(deck)}

UPCOMING CARD CHOICES:
{fmt(upcoming)}

Which card should I pick, and why?
"""

# ─────────────────────────────────────────────
#  API ROUTE
# ─────────────────────────────────────────────

@app.route("/api/advise", methods=["POST"])
def advise():
    data = request.get_json(force=True)

    deck = data.get("deck", [])
    upcoming = data.get("upcoming", [])
    floor = data.get("floor", 1)
    relics = data.get("relics", [])
    boss = data.get("boss", None)

    if not deck and not upcoming:
        return jsonify({"error": "Add some cards first."}), 400

    try:
        response = client.chat.completions.create(
            model= 
                    # "google/gemma-4-31b-it:free",
                    # "google/gemma-4-26b-a4b-it:free",
                    # "nvidia/nemotron-3-super-120b-a12b:free",
                    # "qwen/qwen3-next-80b-a3b-instruct:free",
                    "openai/gpt-oss-120b:free",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_message(deck, upcoming, floor, relics, boss)}
            ],
            max_tokens=8192
        )

        return jsonify({
            "advice": response.choices[0].message.content
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─────────────────────────────────────────────
#  STATIC FILES
# ─────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("static", path)

# ─────────────────────────────────────────────
#  RUN SERVER
# ─────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
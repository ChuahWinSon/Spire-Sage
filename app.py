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

Your job is to look at a player's current deck and a set of cards they are about to pick from, then give clear, specific advice.

Factors:

- A good slay the spire deck should have cards which do damage, block, scale and draw more cards (but not too many of each to make it redundant).
- If you don't need a card, DON'T PICK IT, Please weight not picking any cards more heavily
- If there are too many of a certain type it will bloat the deck, only pickup cards if nessecary. Also think about how the consequences of picking up too many cards now might bloat the deck in the future
- Take possible synergies with current relics into consideration
- Act 1 : Focus on strong statistical cards to bruteforce early stages as your starting deck (5 strikes , 5 defends) is really bad. Focus on improving blocking and attacking through any means (stronger base damage cards, early game scaling powers) but dont take too many cards it might bloat your deck.
- Act 2 : Focus on building up scaling and synergy, cards that help scale into future stages, powers and GOOD synergys (not random synergies like perfected strike to add to the base deck of 5 strikes)
- Act 3 : Focus on mantaining the deck and strong upgrades, by this point the deck should already have the core concept defined, focus on improving it without adding bloat

- Deck size matters for consistency.
- A balanced deck is good, with good blocking options and attack options.

Guidelines:
- Keep answers short, less than 10 words.
- Don't hallucinate, if you're not sure about an infomation just dont talk about it.

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
            max_tokens=1024
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
# Spire Sage

AI deck advisor for Slay the Spire — Flask backend keeps your API key secure.

## Folder structure

```
spire-sage/
├── app.py              ← Flask server + AI prompt (edit your prompt here)
├── requirements.txt
├── .env                ← copy .env.example to .env and add your key
└── static/
    ├── index.html
    ├── app.js
    ├── style.css
    ├── cards.json
    └── images/
```

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Add your API key
cp .env.example .env
# then edit .env and paste in your OpenRouter key:
# OPENROUTER_API_KEY=your_key_here

# 3. Copy your card data into static/
cp your-cards.json static/cards.json
cp -r your-images-folder static/images

# 4. Run
python app.py
# open http://localhost:5000
```

## Getting an OpenRouter API key

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Go to **Keys** in your dashboard and create a new key
3. Paste it into your `.env` file as `OPENROUTER_API_KEY`

Free models are available — no credit card required to get started.

## Where to edit the AI prompt

Open `app.py` and find the `SYSTEM_PROMPT` variable and `build_user_message()` function near the top.  
`SYSTEM_PROMPT` is the persona/instructions. `build_user_message()` controls how the deck data is formatted for the model.

## Changing the model

In `app.py`, find the `model=` line inside the `/api/advise` route. Several alternatives are commented out — swap them in to try different free models from OpenRouter.

## Why Flask instead of calling the API from the browser?

Calling OpenRouter directly from JavaScript exposes your secret API key to anyone who opens DevTools.  
Flask keeps the key in a `.env` file on your machine — the browser only ever talks to your local server at `/api/advise`.

# Spire Sage

An AI wrapper for Slay the Spire. A way for new players to learn Slay the Spire with the help of AI, select your current cards, relics and bossfight and let the AI make a decision for you with an explanation.

## Folder structure

```
spire-sage/
├── app.py              ← Flask server + AI prompt (edit your prompt here)
├── requirements.txt
├── .env       ← copy .env.example to .env and add your key
└── static
    ├── index.html
    ├── app.js
    ├── style.css
    └── cards.json     
    └── images/         
```

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Add your API key
cp .env.example .env
# then edit .env and paste in your API key

# 3. Run
python app.py


# 4. open http://localhost:5000
```

## Changing the model

In `app.py`, find the `model=` line inside the `/api/advise` route. Several alternatives are commented out — swap them in to try different free models from OpenRouter.




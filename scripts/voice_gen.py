"""Generates the caller's voice clips (specs/02-design.md#sound, specs/13-legal.md): voice/<lang>/<key>.pcm.

The clips are committed: the BUSY Apps Catalog builds offline, without Python or a speech model. scripts/voice.mjs turns
them into the bar's .snd files during `busy-cli build`. Run this only to change a voice or a phrase.

Engine: Kokoro-82M (Apache-2.0 weights), through kokoro-onnx. Voices: af_heart (English), ff_siwis (French; trained on
the SIWIS French Speech Synthesis Database, University of Edinburgh, CC BY 4.0). Setup, in a folder outside the repo:

  python -m venv venv && venv/Scripts/python -m pip install kokoro-onnx soundfile
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
  venv/Scripts/python <repo>/scripts/voice_gen.py <folder with the two model files> <repo>

ffmpeg must be on the PATH. Each clip: silence trimmed at both ends, high-passed at 250 Hz (the bar's speaker has no
bass), loudness-normalized, mono, 22 050 Hz, raw PCM s16le (half the bar's rate: the build doubles it).
"""
import os, subprocess, sys
import soundfile as sf
from kokoro_onnx import Kokoro

UNITS_EN = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen " \
           "seventeen eighteen nineteen".split()
TENS_EN = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
UNITS_FR = "zéro un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dix-sept " \
           "dix-huit dix-neuf".split()
TENS_FR = "_ _ vingt trente quarante cinquante soixante soixante quatre-vingt quatre-vingt".split()


def words_en(n):
    if n < 20:
        return UNITS_EN[n]
    t, u = divmod(n, 10)
    return TENS_EN[t] + ("-" + UNITS_EN[u] if u else "")


def words_fr(n):
    if n < 20:
        return UNITS_FR[n]
    t, u = divmod(n, 10)
    if t in (7, 9):  # soixante-dix, quatre-vingt-dix: the units run on from ten
        u += 10
    base = TENS_FR[t]
    if u == 0:
        return base + ("s" if t == 8 else "")  # quatre-vingts
    if u in (1, 11) and t not in (8, 9):
        return f"{base} et {UNITS_FR[u]}"  # vingt et un, soixante et onze
    return f"{base}-{UNITS_FR[u]}"


VOICES = {
    "en": ("af_heart", "en-us", words_en, {"bingo": "Bingo!", "line": "Line!", "two_lines": "Two lines!",
                                          "full_house": "Full house!"}),
    "fr": ("ff_siwis", "fr-fr", words_fr, {"bingo": "Bingo !", "line": "Quine !", "two_lines": "Double quine !",
                                          "full_house": "Bingo !"}),  # the room shouts Bingo for a full house
}


def main():
    models, repo = sys.argv[1], sys.argv[2]
    k = Kokoro(os.path.join(models, "kokoro-v1.0.onnx"), os.path.join(models, "voices-v1.0.bin"))
    for lang, (voice, code, words, prizes) in VOICES.items():
        phrases = {f"n{n}": words(n).capitalize() + (" !" if lang == "fr" else "!") for n in range(1, 91)}
        phrases.update({l: f"{l}." for l in "BINGO"})
        phrases.update(prizes)
        out = os.path.join(repo, "voice", lang)
        os.makedirs(out, exist_ok=True)
        for key, text in phrases.items():
            samples, rate = k.create(text, voice=voice, speed=0.95, lang=code)
            wav = os.path.join(out, key + ".wav")
            sf.write(wav, samples, rate)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-ac", "1", "-af",
                            "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                            "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                            "highpass=f=250,loudnorm=I=-6:TP=-2",
                            "-acodec", "pcm_s16le", "-f", "s16le", "-ar", "22050", os.path.join(out, key + ".pcm")],
                           check=True)
            os.remove(wav)
            print(lang, key, text)


if __name__ == "__main__":
    main()

"""Convert curated ranch PNGs into web JPEGs for the showcase gallery."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\phsok\OneDrive\Desktop\petting-zoo\_tmp_unique")
DST = Path(r"C:\Users\phsok\OneDrive\Desktop\petting-zoo\images\showcase")
MAX_EDGE = 1800
QUALITY = 85

# source -> (filename, categories, alt, featured_order or 0)
MAPPING = {
    # Lead / featured
    "IMG_9542.png": (
        "highland-calf-golden-hour.jpg",
        ["featured", "cows"],
        "Young ginger Highland calf with ear tag R looking at the camera in golden-hour light",
        1,
    ),
    "IMG_9547.png": (
        "blue-eyed-goat-kid-fence.jpg",
        ["featured", "goats"],
        "Tri-colored goat kid with striking blue eyes looking through a red wire fence in hay",
        2,
    ),
    "IMG_9536.png": (
        "fluffy-donkey-tongue-out.jpg",
        ["featured", "ponies"],
        "Shaggy cream-and-brown donkey with an orange halter playfully sticking its tongue out",
        3,
    ),
    "IMG_9538.png": (
        "sunset-porch-swings.jpg",
        ["featured", "farm"],
        "Sunset over ranch porch swings, green pasture, fencing, and string lights under a golden sunburst",
        4,
    ),
    "IMG_9545.png": (
        "mother-cow-calf-peeking.jpg",
        ["featured", "cows"],
        "Dark brown mother cow with ear tag R and her calf peeking beside her",
        5,
    ),
    # Cows
    "IMG_9531.png": (
        "highland-calf-portrait.jpg",
        ["cows"],
        "Close-up of a young ginger Highland calf with ear tag R facing the camera",
        0,
    ),
    "IMG_9494.png": (
        "highland-grazing-pasture.jpg",
        ["cows"],
        "Shaggy ginger Highland cow grazing by a black fence with a white shed beyond",
        0,
    ),
    "IMG_9537.png": (
        "highland-grazing-sunny.jpg",
        ["cows"],
        "Young ginger Highland cow grazing in bright sun beside a black post-and-rail fence",
        0,
    ),
    "IMG_9539.png": (
        "highland-grazing-profile.jpg",
        ["cows"],
        "Profile of a shaggy ginger Highland cow grazing with grass in its mouth",
        0,
    ),
    "IMG_9535.png": (
        "dark-brown-calf-ear-tag-2.jpg",
        ["cows"],
        "Dark brown calf with budding horns and white ear tag numbered 2",
        0,
    ),
    "IMG_9510.png": (
        "cow-and-calf-shelter.jpg",
        ["cows"],
        "Dark cow and calf resting in the shade of a wooden ranch shelter",
        0,
    ),
    "IMG_9511.png": (
        "cattle-under-shelter.jpg",
        ["cows"],
        "Highland cow and other cattle gathered under a wooden shade shelter",
        0,
    ),
    # Goats
    "IMG_9507.png": (
        "blue-eyed-goat-tunnel.jpg",
        ["goats"],
        "Tan-and-white young goat with pale blue eyes looking out from a black plastic tunnel",
        0,
    ),
    "IMG_9502.png": (
        "ginger-goat-portrait.jpg",
        ["goats"],
        "Ginger goat with small horns and an R ear tag resting inside a dark shelter",
        0,
    ),
    "IMG_9512.png": (
        "goat-at-fence-rail.jpg",
        ["goats"],
        "Tan goat with facial stripes resting its chin on a black fence rail",
        0,
    ),
    "IMG_9519.png": (
        "brown-goat-pipe-portrait.jpg",
        ["goats"],
        "Light brown bearded goat framed by a black corrugated pipe opening",
        0,
    ),
    "IMG_9523.png": (
        "mother-and-kid-bubbles.jpg",
        ["goats"],
        "Mother goat and kid named Bubbles snuggled together in a black feed bin",
        0,
    ),
    "IMG_9546.png": (
        "brown-white-goat-hay.jpg",
        ["goats"],
        "Brown-and-white goat with an R ear tag standing on a red hay feeder",
        0,
    ),
    # Ponies & Donkeys (incl. horses)
    "IMG_9491.png": (
        "chestnut-pony-trotting.jpg",
        ["ponies"],
        "Light chestnut pony with a flowing blonde mane and purple halter trotting in a green pasture",
        0,
    ),
    "IMG_9506.png": (
        "ponies-grazing-together.jpg",
        ["ponies"],
        "White spotted pony and tan companion grazing side by side in purple halters",
        0,
    ),
    "IMG_9540.png": (
        "pinto-pony-shaggy-donkey.jpg",
        ["ponies"],
        "Brown-and-white pinto pony standing beside a shaggy spotted donkey grazing",
        0,
    ),
    "IMG_9508.png": (
        "ponies-in-paddock.jpg",
        ["ponies"],
        "Four ponies grazing in a sandy paddock with string lights and a white outbuilding",
        0,
    ),
    "IMG_9500.png": (
        "dark-horse-eating-hay.jpg",
        ["ponies"],
        "Close-up of a dark brown horse with a white star eating hay",
        0,
    ),
    "IMG_9514.png": (
        "chestnut-horse-profile.jpg",
        ["ponies"],
        "Profile of a chestnut horse with a white blaze and gray halter chewing hay",
        0,
    ),
    "IMG_9533.png": (
        "chestnut-horse-at-fence.jpg",
        ["ponies"],
        "Friendly chestnut horse with a white blaze resting its head on a black fence rail",
        0,
    ),
    # Dogs
    "IMG_9549.png": (
        "golden-retriever-on-hay.jpg",
        ["dogs"],
        "Happy golden retriever standing on a hay bale with tongue out on a sunny ranch day",
        0,
    ),
    "IMG_9504.png": (
        "goldens-on-atv.jpg",
        ["dogs"],
        "Adult golden retriever and six puppies posing on a red Polaris ATV",
        0,
    ),
    "IMG_9499.png": (
        "golden-puppies-pile.jpg",
        ["dogs"],
        "Close-up pile of sleeping golden retriever puppies huddled together",
        0,
    ),
    "IMG_9497.png": (
        "sleeping-golden-puppy.jpg",
        ["dogs"],
        "Golden retriever puppy sleeping curled up on a soft tan blanket",
        0,
    ),
    "IMG_9505.png": (
        "snuggling-golden-puppies.jpg",
        ["dogs"],
        "Two fluffy golden retriever puppies snuggling asleep on a wooden floor",
        0,
    ),
    "IMG_9513.png": (
        "golden-puppy-in-grass.jpg",
        ["dogs"],
        "Fluffy golden retriever puppy lying in green grass with a sweet expression",
        0,
    ),
    "IMG_9493.png": (
        "dalmatian-puppy-walking.jpg",
        ["dogs"],
        "Liver-spotted Dalmatian puppy walking toward the camera on a dirt path",
        0,
    ),
    "IMG_9498.png": (
        "liver-dalmatian-puppy.jpg",
        ["dogs"],
        "Liver-spotted Dalmatian puppy standing on a stone walkway",
        0,
    ),
    "IMG_9527.png": (
        "dalmatian-at-lake.jpg",
        ["dogs"],
        "Dalmatian with a pink collar standing in shallow lake water looking toward the shore",
        0,
    ),
    # Birds
    "IMG_9532.png": (
        "geese-flock-pasture.jpg",
        ["birds"],
        "Flock of grey-brown geese walking across a sunny green pasture",
        0,
    ),
    "IMG_9524.png": (
        "golden-rooster-crowing.jpg",
        ["birds"],
        "Vibrant golden-orange rooster with a bright red comb crowing in a sunlit enclosure",
        0,
    ),
    "IMG_9521.png": (
        "chickens-feeding-trough.jpg",
        ["birds"],
        "Diverse flock of chickens feeding at a long teal trough in a wooden enclosure",
        0,
    ),
    "IMG_9516.png": (
        "chicken-coop-and-run.jpg",
        ["birds"],
        "White chicken coop with a black-framed wire run and chickens inside",
        0,
    ),
    "IMG_9525.png": (
        "hens-nesting-with-eggs.jpg",
        ["birds"],
        "White and brown hens in a wooden nesting box with eggs in the shavings",
        0,
    ),
    "IMG_9526.png": (
        "barred-hen-nesting.jpg",
        ["birds"],
        "Black-and-white barred hen sitting in a wooden nesting box of wood shavings",
        0,
    ),
    # Farm & landscape
    "IMG_9501.png": (
        "sunset-ranch-pink-sky.jpg",
        ["farm"],
        "Pink-and-purple sunset over ranch porch swings, lawn, and fenced enclosures",
        0,
    ),
    "IMG_9515.png": (
        "ranch-string-lights-night.jpg",
        ["farm"],
        "Warm string lights glowing over the ranch path and buildings under a crescent moon",
        0,
    ),
    "IMG_9541.png": (
        "red-barn-twin-silos.jpg",
        ["farm"],
        "Large red barn flanked by two tall concrete silos under a bright blue sky",
        0,
    ),
    "IMG_9529.png": (
        "farm-silos-sunset.jpg",
        ["farm"],
        "Tall concrete silo and red barns at sunset beside a green grassy mound",
        0,
    ),
    "IMG_9528.png": (
        "massey-ferguson-tractor.jpg",
        ["farm"],
        "Vintage red Massey-Ferguson tractor with a concrete silo and red barn behind it",
        0,
    ),
    "IMG_9544.png": (
        "massey-ferguson-golden-hour.jpg",
        ["farm"],
        "Red Massey-Ferguson 1100 tractor at golden hour with silos and a red barn",
        0,
    ),
    "IMG_9503.png": (
        "horse-drawn-carriage.jpg",
        ["farm"],
        "Black horse-drawn carriage with a grey canvas top parked beside hay bales",
        0,
    ),
    "IMG_9517.png": (
        "barn-aisle-interior.jpg",
        ["farm"],
        "Clean barn aisle with wooden stalls and overhead lights leading to a bright doorway",
        0,
    ),
    "IMG_9518.png": (
        "barn-aisle-string-lights.jpg",
        ["farm"],
        "Rustic barn hallway with wooden stalls and warm Edison string lights",
        0,
    ),
}


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)
    manifest = []

    for src_name, (out_name, cats, alt, feat) in MAPPING.items():
        im = Image.open(SRC / src_name)
        if im.mode != "RGB":
            im = im.convert("RGB")
        w, h = im.size
        scale = min(1.0, MAX_EDGE / max(w, h))
        if scale < 1.0:
            im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        out_path = DST / out_name
        im.save(out_path, "JPEG", quality=QUALITY, optimize=True)
        size_kb = out_path.stat().st_size / 1024
        manifest.append(
            {
                "file": out_name,
                "cats": cats,
                "alt": alt,
                "feat": feat,
                "w": im.size[0],
                "h": im.size[1],
                "kb": round(size_kb, 1),
            }
        )
        print(f"OK {out_name} ({im.size[0]}x{im.size[1]}, {size_kb:.0f}KB)")

    cat_order = {
        "featured": 0,
        "cows": 1,
        "goats": 2,
        "ponies": 3,
        "dogs": 4,
        "birds": 5,
        "farm": 6,
    }

    def sort_key(m: dict):
        if m["feat"]:
            return (0, m["feat"])
        primary = [c for c in m["cats"] if c != "featured"][0]
        return (1, cat_order.get(primary, 9), m["file"])

    manifest.sort(key=sort_key)
    (SRC / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nTotal: {len(manifest)} images")
    print(f"Total size: {sum(m['kb'] for m in manifest):.0f} KB")


if __name__ == "__main__":
    main()

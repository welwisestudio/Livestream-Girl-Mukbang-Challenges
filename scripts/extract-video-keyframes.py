"""Extract timestamped MP4 frames through Blender's bundled video decoder.

Run with Blender, for example:
blender --background --python scripts/extract-video-keyframes.py -- \
  --input reference/input/GameplayVideo.mp4 --output output/frames --interval 10
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--times", default="")
    parser.add_argument("--interval", type=float, default=0.0)
    parser.add_argument("--width", type=int, default=360)
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(arguments)


def timestamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    secs, milliseconds = divmod(milliseconds, 1_000)
    return f"{hours:02d}-{minutes:02d}-{secs:02d}-{milliseconds:03d}"


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    scene = bpy.context.scene
    if scene.sequence_editor is not None:
        scene.sequence_editor_clear()
    editor = scene.sequence_editor_create()
    strips = getattr(editor, "strips", None)
    if strips is None:
        strips = getattr(editor, "sequences", None)
    if strips is None:
        raise RuntimeError("Blender sequence editor exposes neither strips nor sequences")

    movie = strips.new_movie(
        name="GameplayVideo",
        filepath=str(input_path),
        channel=1,
        frame_start=1,
    )

    fps = float(getattr(movie, "fps", 0.0))
    if fps <= 0:
        fps = scene.render.fps / scene.render.fps_base

    duration_frames = int(movie.frame_final_duration)
    duration_seconds = duration_frames / fps
    element = movie.elements[0]
    source_width = int(element.orig_width)
    source_height = int(element.orig_height)
    output_width = max(2, int(args.width))
    output_height = max(2, round(output_width * source_height / source_width))
    if output_width % 2:
        output_width += 1
    if output_height % 2:
        output_height += 1

    if args.times:
        requested_times = [float(value) for value in args.times.split(",") if value.strip()]
    elif args.interval > 0:
        requested_times = []
        current = 0.0
        while current < duration_seconds:
            requested_times.append(current)
            current += args.interval
        if not requested_times or requested_times[-1] < duration_seconds - 0.2:
            requested_times.append(max(0.0, duration_seconds - 0.1))
    else:
        raise ValueError("Provide --times or a positive --interval")

    scene.render.resolution_x = output_width
    scene.render.resolution_y = output_height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.use_file_extension = True

    frames = []
    for requested in requested_times:
        second = min(max(0.0, requested), max(0.0, duration_seconds - 0.001))
        frame_number = min(
            movie.frame_final_end - 1,
            movie.frame_final_start + round(second * fps),
        )
        scene.frame_set(frame_number)
        filename = f"frame-{timestamp(second)}.png"
        destination = output_dir / filename
        scene.render.filepath = str(destination)
        bpy.ops.render.render(write_still=True)
        frames.append(
            {
                "requested_seconds": requested,
                "actual_seconds": second,
                "timestamp": timestamp(second).replace("-", ":", 2).replace("-", ".", 1),
                "frame_number": frame_number,
                "file": str(destination),
            }
        )

    metadata = {
        "input": str(input_path),
        "duration_seconds": duration_seconds,
        "fps": fps,
        "duration_frames": duration_frames,
        "source_width": source_width,
        "source_height": source_height,
        "output_width": output_width,
        "output_height": output_height,
        "frames": frames,
    }
    (output_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("CODEX_VIDEO_METADATA=" + json.dumps(metadata, ensure_ascii=False))


if __name__ == "__main__":
    main()

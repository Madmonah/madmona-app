# Pull a few frames out of a video so I can see which project it belongs to
import subprocess, sys, os

src, out = sys.argv[1], sys.argv[2]
# grab 4 frames spread across the clip, tile them into one image
cmd = ['ffmpeg', '-y', '-i', src, '-vf', "select='not(mod(n\\,150))',scale=480:-1,tile=2x2", '-frames:v', '1', out]
r = subprocess.run(cmd, capture_output=True, text=True)
print('ok' if os.path.exists(out) else 'FAILED')
if not os.path.exists(out):
    print(r.stderr[-600:])

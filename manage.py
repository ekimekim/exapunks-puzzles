
import json
import os
import shutil

import argh


ASSOC_FILE = 'associations.json'
STEAMID_FILE = 'steamid'
GAME_PATH = os.path.expanduser('~/.local/share/EXAPUNKS/{}/custom')


def get_game_path():
	with open(STEAMID_FILE) as f:
		return GAME_PATH.format(f.read().strip())


def configure(steam_id):
	"""Save the steam id to find the game directory under."""
	with open(STEAMID_FILE, 'w') as f:
		f.write(steam_id + '\n')


def associate(game_file, local_file, force=False, delete=False):
	game_path = get_game_path()
	if '/' in game_file:
		game_file = os.path.abspath(game_file)
		if not game_file.startswith(game_path):
			raise ValueError("path {!r} does not point to a custom puzzle in {!r}".format(game_file, game_path))
		game_file = os.path.basename(game_file)
	game_file_path = os.path.join(game_path, game_file)
	assoc = load_assoc()
	if delete:
		assoc.pop(game_file, None)
		save_assoc(assoc)
	if local_file in assoc and not force:
		raise ValueError(
			"file {!r} already has existing association {!r}, pass --force to overwrite".format(
				local_file, assoc[local_file]
			)
		)
	assoc[local_file] = game_file
	if os.path.exists(game_file_path):
		shutil.copy2(game_file_path, local_file)
	elif not force:
		raise ValueError("File does not exist: {!r}".format(game_file))
	save_assoc(assoc)


def load_assoc():
	if not os.path.exists(ASSOC_FILE):
		return {}
	with open(ASSOC_FILE) as f:
		return json.loads(f.read())


def save_assoc(assoc):
	with open(ASSOC_FILE, 'w') as f:
		f.write(json.dumps(assoc, indent=4) + '\n')


def install(*files):
	assoc = load_assoc()
	game_path = get_game_path()
	if not files:
		files = assoc.keys()
	for path in files:
		dest = os.path.join(game_path, assoc[path])
		print "Installed {} -> {}".format(path, dest)
		shutil.copy2(path, dest)


if __name__ == '__main__':
	argh.dispatch_commands([configure, associate, install])

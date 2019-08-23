import random

def set_game_won(G, player, reason):
	G.temp.won = adict()
	G.temp.won.reason = reason
	G.temp.won.player = player
	print('hallo')

def check_victory_by_military(G, player):
	tiles = []
	for pl in G.players:
		if pl == player:
			continue
		print(pl) #G.players[pl].cities.SubCapitals)
		a=G.players[pl].cities.MainCapital
		b=G.players[pl].cities.SubCapitals
		c=tiles.extend([a])
		d=tiles.extend(b)
		#tiles = tiles.extend([G.players[pl].cities.MainCapital]).extend(G.players[pl].cities.SubCapitals)
		print(tiles)
	cnt = 0
	for tilename in tiles:
		tile = G.tiles[tilename]
		if 'owner' in tile and tile.owner == player:
			cnt += 1
		if cnt >= 2:
			return True
	return False

# from tnt_util import compute_tracks, count_victory_points
# from util import adict, xset, tdict, tlist, tset, PhaseComplete
# from battles import encode_accept

# #end of game:
# #if in code a winning condition occurs,
# # set_game_won will be set and then
# # raise GameEnd
# # at this point, will enter game_ends_phase, for now super simple
# # front end will check for G.temp.won key.

# def set_game_won(G, player, reason):
# 	G.temp.won = adict()
# 	G.temp.won.reason = reason
# 	G.temp.won.player = player

# def check_victory_by_military(G, candidate):
# 	print('hallo')
# 	# #win if this player is owner of two tiles in G.rivals.cities.mainCapital or Subcapitals
# 	# tiles = []
# 	# for pl in G.players:
# 	# 	if pl == candidate:
# 	# 		continue
# 	# 	print(G[pl].cities.SubCapitals)
# 	# 	# tiles = tiles.extend([G[pl].cities.mainCapital]).extend(list(G[pl].cities.SubCapitals))
# 	# cnt = 0
# 	# for tilename in tiles:
# 	# 	if G.tiles[tilename].owner == candidate:
# 	# 		cnt += 1
# 	# 	if cnt >= 2:
# 	# 		return True
# 	# return False

# def game_ends_phase(G, player, action):
# 	return encode_accept(G, player)

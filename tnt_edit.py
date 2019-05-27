import sys, os, time
import pickle
import networkx as nx
import random
import util
from util import adict, idict, iddict, tdict, tlist, tset, xset, collate, load, seq_iterate, render_dict, save, Logger
from tnt_setup import init_gamestate, setup_phase
import tnt_setup as setup
from collections import namedtuple
import traceback
from passive_backend import WAITING_OBJS, WAITING_ACTIONS, REPEATS, step, get_G, get_waiting, process_actions, evaluate_action
from production import production_phase, encode_production_actions
from tnt_errors import ActionError
import json


def edit_step(player, action):
	G = get_G()
	global WAITING_ACTIONS
	global WAITING_OBJS
	global REPEATS
	G.objects.created = tdict()
	G.objects.updated = tdict()
	G.objects.removed = tdict()
	G.begin()
	if len(action) == 4:
		#this is unit add
		nationality, tilename, unit_type, cv = action
		unit = adict()
		unit.nationality = nationality
		unit.tile = tilename
		unit.type = unit_type
		unit.cv = cv
		print('vor add_unit')
		#unit = e_add_unit(G, unit)
		unit = idict(unit.items())
		unit.obj_type = 'unit'
		unit.visible = tset([player])
		#???G.nations.status[unit.nationality][unit._id] = unit
		reserves = G.units.reserves[unit.nationality]
		if reserves[unit.type] > 0:
			reserves[unit.type] -= 1
		G.players[player].units[unit._id] = unit
		tilename = unit.tile
		tile = G.tiles[tilename]
		# add to sets
		tile.units.add(unit._id)
		G.objects.table[unit._id] = unit
		G.objects.created[unit._id] = unit
		G.objects.updated[tilename] = tile
		print('after add_unit')

	G.commit()
	print('change has been committed!!!', player, unit)
	#update waiting objects and actions
	#???WAITING_OBJS, WAITING_ACTIONS = get_waiting()
	print('---------------\n', G.players)
	for name in G.players.keys():
		print('name:', name)
		if name not in WAITING_OBJS:
			print('***player: ', player, 'not in WAITING_OBJS')
			WAITING_OBJS[name] = adict()
			WAITING_OBJS[name].created = adict()
			WAITING_OBJS[name].updated = adict()
			WAITING_OBJS[name].removed = adict()
		WAITING_OBJS[name].created.update(G.objects.created)
		WAITING_OBJS[name].updated.update(G.objects.updated)
		WAITING_OBJS[name].removed.update(G.objects.removed)
	#???WAITING_ACTIONS = response
	#print('waiting_actions',WAITING_ACTIONS)
	if player not in WAITING_OBJS:
		print('*REPEATS**player: ', player, 'not in WAITING_OBJS')
		out = REPEATS[player]
	out = WAITING_OBJS[player]
	del WAITING_OBJS[player]
	if player in WAITING_ACTIONS:
		out.actions = WAITING_ACTIONS[player]
	else:
		out.waiting_for = xset(WAITING_ACTIONS.keys())
	out.log = G.logger.pull(player)
	REPEATS[player] = out
	return out

def e_move_unit(G, unit, to_tilename):

	# possibly convert to/from convoy
	check_for_convoy(unit, G.tiles[to_tilename])

	tile = G.tiles[unit.tile]
	tile.units.remove(unit._id)
	G.objects.updated[unit.tile] = tile

	check_unsupplied(G, G.nations.designations[unit.nationality], tile)

	unit.tile = to_tilename
	tile = G.tiles[unit.tile]
	tile.units.add(unit._id)

	G.objects.updated[unit._id] = unit
	G.objects.updated[unit.tile] = tile

def e_remove_unit(G, unit):
	player = G.nations[unit.nationality]
	tilename = unit.tile

	if unit.type == 'Convoy':
		unit.type = unit.carrying
		del unit.carrying

	if player in {'Minor', 'Major'}:
		status = G.nations.status[unit.nationality]
		del status[unit._id]
	else:

		# update reserves
		reserves = G.units.reserves[unit.nationality]
		if unit.type not in reserves:
			reserves[unit.type] = 0
		reserves[unit.type] += 1

	G.tiles[tilename].units.remove(unit._id)
	del G.players[player].units[unit._id]
	del G.objects.table[unit._id]
	G.objects.removed[unit._id] = unit

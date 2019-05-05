
from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit
from tnt_util import travel_options, eval_tile_control, add_next_phase, switch_phase
from government import check_revealable, reveal_tech
import random
from diplomacy import declaration_of_war, violation_of_neutrality


def encode_command_card_phase(G):
	
	code = adict()
	
	player = G.temp.active_players[G.temp.active_idx]
	options = xset()
	options.add('pass')
	
	options.update(G.players[player].hand)
	# options.update(cid for cid in G.players[player].hand if 'action' in G.objects.table[cid].obj_type)
	
	code[player] = (options,)
	
	return code

def check_declarations(G, player):
	
	options = xset()
	
	# wars
	options.add((xset(name for name, war in G.players[player].stats.at_war_with.items() if not war),))
	
	# neutral
	
	nations = xset(G.diplomacy.neutrals.keys())
	nations -= G.players[player].diplomacy.violations
	
	options.add((nations,))
	
	return options


def pre_command_phase(G):

	if 'temp' in G:
		del G.temp
	
	G.temp = tdict()
	G.temp.season = G.game.sequence[G.game.index]
	
	G.temp.active_idx = 0
	G.temp.active_players = G.game.turn_order.copy()
	if G.temp.season == 'Winter':
		G.temp.active_players = tlist(p for p in G.game.turn_order if G.players[p].stats.enable_Winter)
	
	G.temp.decision = tdict()
	G.temp.passes = 0
	
	G.temp.borders = tdict({p:tdict() for p in G.players})
	
	G.temp.battles = tdict()
	
	return encode_command_card_phase(G)


def command_phase(G, player, action):
	
	if 'commands' not in G.temp: # choose command cards or pass
		code = planning_phase(G, player, action)
		
		if code is not None:
			return code
	
	if 'order' in G.temp: # use command cards for movement etc
		code = movement_phase(G, player, action)
		
		if code is not None:
			return code
		
	if len(G.temp.battles): # choose battles and resolve
		code = combat_phase(G, player, action)
	
		if code is not None:
			return code
	
	G.logger.write('{} is complete'.format(G.temp.season))
	
	end_phase(G)


def planning_phase(G, player, action):
	
	faction = G.players[player]
	
	head, *tail = action
	
	if head == 'pass':
		G.temp.passes += 1
		G.temp.active_idx += 1
		G.temp.active_idx %= len(G.temp.active_players)
		
		G.logger.write('{} passes'.format(player))
	
	elif head in faction.hand:
		G.temp.passes = 0
		card = G.objects.table[head]
		# if 'owner'
		del card.owner
		G.objects.updated[head] = card
		
		G.temp.decision[player] = card
		
		faction.hand.remove(head)
		
		G.logger.write('{} plays a card'.format(player))
		
		G.temp.active_players.remove(player)
		if len(G.temp.active_players):
			G.temp.active_idx %= len(G.temp.active_players)
	
	if len(G.temp.active_players) > G.temp.passes:
		return encode_command_card_phase(G)
	
	# evaluate card choices
	
	G.temp.commands = tdict()
	
	for p, card in G.temp.decision.items():  # RULE OVERRULED: emergency priority tie breaks are automatic
		if 'season' in card:
			cmd = tdict()
			cmd.priority = card.priority
			cmd.moved = tset()
			cmd.declarations = tset()
			
			if card.season == G.temp.season:
				val = card.value
				msg = ' {} command: {} {}'.format(card.season, card.priority, val)
			else:
				cmd.emergency = True
				val = G.players[p].stats.emergency_command
				msg = 'n emergency command: {} {}'.format(card.priority, val)
			
			cmd.value = val
			G.temp.commands[p] = cmd
		
		else:
			msg = ' bluff (investment card)'
		
		G.logger.write('{} has played a{}'.format(p, msg))
		
		discard_cards(G, card._id)
	
	
	if len(G.temp.commands):
		
		G.temp.order = tlist(k for k, v in sorted([(k, v.priority + ('e' if 'emergency' in v else ''))
		                                           for k, v in G.temp.commands.items()],
		                                          key=lambda x: x[1]))
		G.logger.write('Play order is: {}'.format(', '.join(G.temp.order)))
		
		G.temp.active_idx = 0
		
		add_next_phase(G, 'Movement')
	
	else:
		
		G.logger.write('No player played a command card during {}'.format(G.temp.season))
		
	
	raise PhaseComplete

#################
# Movement phase

def encode_movement(G):
	player = G.temp.order[G.temp.active_idx]
	faction = G.players[player]
	cmd = G.temp.commands[player]
	
	assert cmd.value > 0, 'No more commands - shouldve moved on to next player'
	
	options = xset()
	options.add(('pass',))
	
	if len(cmd.moved) == 0:  # no units have been moved yet -> can make declarations
		options.update(check_declarations(G, player))
	
	for uid, unit in faction.units.items():
		locs = travel_options(G, unit)
		if len(locs):
			options.add((unit._id, locs))
	
	# reveal techs in secret vault
	options.update(check_revealable(G, player))
	
	code = adict()
	code[player] = options
	return code

def movement_phase(G, player=None, action=None):
	
	if player is None: # when returning from some interrupting phase
		return encode_movement(G)
	
	faction = G.players[player]
	
	head, *tail = action
	
	if head in faction.secret_vault:
		reveal_tech(G, player, head)
		
	elif head in faction.stats.rivals: # declaration of war
		declaration_of_war(G, player, head)
		
	elif head in G.diplomacy.neutrals:
		violation_of_neutrality(G, player, head)
	
	elif head in faction.units:
		
		destination, *border = tail
		
		if len(border):
			if border not in G.temp.borders[player]:
				G.temp.borders[player][border] = 0
			G.temp.borders[player][border] += 1
		
		unit = faction.units[head]
		
		# update disputed, add battles
		eval_tile_control(G, G.tiles[unit.tile])
		eval_tile_control(G, G.tiles[destination])
		
		move_unit(G, unit, destination)
		
		# decrement command points
		
	pass
		

def combat_phase(G, player, action):
	
	
	pass

def end_phase(G):
	
	# check blockades
	raise NotImplementedError
	
	raise PhaseComplete


from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete, PhaseInterrupt
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit
from tnt_util import travel_options
from government import check_revealable, reveal_tech
from structures.common import condensed_str
from battles import encode_accept, find_unit_owner
from command import powers_present
from battles import find_unit_owner

#******************************
#           helpers           *
#******************************
def add_battles_to_reveal(G, player):
	#turn all units to be visible on each tile in G.temp.battles_to_reveal
	#moves revealed battles from battles_to_reveal to battles_to_fight
	#print('battles are revealed...')
	c = G.temp.combat
	for tile in c.battles_to_reveal:
		# atk = c.battles_to_reveal[tile]
		#print('...', tile, type(tile))
		units = G.tiles[tile].units
		c.battles[tile] = adict()
		c.battles_remaining.append(tile)
		b = c.battles[tile]
		b.tilename = tile
		b.tile = G.tiles[tile]
		b.isSeaBattle = b.tile.type in ['Sea', 'Ocean']
		#find owners of units on that tile
		#TODO: replace by powers_present!!!
		owners = [k for k in powers_present(G, b.tile)]

		if len(owners) != 2:
			#TODO implement 3 way battles
			#if this is the defender, needs to choose who to attack
			#for now assume that there must be exactly 2 parties in a combat
			c.ERROR = 'NOT SUPPORTED: COMBAT WITH POWERS != 2 ' + b.tilename
			pass
		
		b.owner = b.tile.owner if 'owner' in tile else None
		uidsList = [k for k in units]
		if not b.owner:
			uid = uidsList[0]
			b.owner = find_unit_owner(G, G.objects.table[uid])

		b.intruder = owners[1] if b.owner == owners[0] else owners[0]
		
		assert G.temp.attacker == player, 'ATTACKER != PLAYER!!!!!!'
		b.attacker = G.temp.attacker  #GANZ SICHER RICHTIG
		b.defender = owners[1] if b.attacker == owners[0] else owners[0]
		b.units = []

		for id in units:
			unit = G.objects.table[id]
			unit.visible = xset(G.players.keys())
			G.objects.updated[id] = unit
			attacker = b.attacker
			defender = b.defender
			uowner = find_unit_owner(G, unit)
			uopponent = defender if uowner == attacker else attacker
			utype = unit.type
			ugroup = G.units.rules[utype].type
			upriority = G.units.rules[utype].priority
			udamage = G.units.rules[utype]
			uid = id

			u_battle_group = None
			if b.isSeaBattle and b.tilename in G.temp.battle_groups and uid in G.temp.battle_groups[b.tilename]:
				u_battle_group = G.temp.battle_groups[b.tilename][uid]
			
			uff = False
			prec_bomb = False
			air_def_radar = False
			sonar = False

			u = adict()
			u.unit = unit
			u.owner = uowner
			u.group = ugroup
			u.priority = upriority
			u.rules = udamage
			u.id = uid
			u.battle_group = u_battle_group
			#modifying cards
			uff = hasFirstFire(G, uowner, utype)

			if uowner in G.players:
				tech = G.players[player].technologies

				#determine IND damage of AirForce:
				if utype == 'AirForce' and 'Jets' in tech:
					prec_bomb = True

				#	air defense radar:
				#Air Forces in Friendly Territory (1.14) Fire doubledice (two dice/CV) at Enemy Air
				if uowner == b.owner and utype == 'AirForce' and 'Air_Defense_Radar' in tech:
					air_def_radar = True

				#sonar
				if utype == 'Fleet' and 'Sonar' in tech:
					sonar = True

			u.ff = uff
			u.sonar = sonar
			u.air_def_radar = air_def_radar
			u.prec_bomb = prec_bomb
			u.type = unit.type

			#if owner of this unit is defender he goes first by default
			#u.turn 0: this unit goes before same type of opponent, otherwise 1
			u.turn = 0
			opp_has_ff = hasFirstFire(G, uopponent, utype)

			uHasFF = False
			if uowner == 'Minor':
				if not opp_has_ff:
					uHasFF = True
			elif uopponent == 'Minor':
				if u.ff:
					uHasFF = True
			elif uowner == attacker and G.players[uowner].stats.DoW[uopponent] and not opp_has_ff:
				uHasFF = True
			elif uowner == attacker and u.ff and not opp_has_ff:
				uHasFF = True
			elif uowner == defender and (u.ff or (not opp_has_ff and not G.players[uopponent].stats.DoW[uowner])):
				uHasFF = True
			u.turn = 0 if uHasFF else 1

			b.units.append(u)

		unitsSorted = sorted(b.units, key=lambda u: u.battle_group if u.battle_group else 'zzz') if b.isSeaBattle else b.units
		b.fire_order = sorted(unitsSorted, key=lambda u: u.priority * 10 + u.turn)
	c.battles_to_reveal.clear()

def determine_stage(G, player):
	c = G.temp.combat
	nBattles = len(c.battles_remaining)
	if len(c.battles_to_select):
		c.stage = 'opt'
	elif nBattles > 1:
		c.stage = 'next'
		c.stages.append(c.stage)
	elif nBattles == 1:
		c.stage = 'battle'
		c.stages.append(c.stage)
		only_key = c.battles_remaining[0]
		c.battle = c.battles[only_key]
		c.battles_remaining = []
	else:
		assert nBattles == 0, 'determine_stage: MATH ERROR!!!'
		c.stage = 'combat_end'
		c.stages.append(c.stage)

def encode_battles_to_select(G, player):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	options.add(('pass',))
	for b in G.temp.combat.battles_to_select:
		options.add((b,))
	#print('* * vor code[player]=options', options)
	code[player] = options
	return code

def encode_options_for_next_battle(G, player):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	for b in G.temp.combat.battles_remaining:
		options.add((b,))
	#print('* * select next battles_to_fight', options)
	code[player] = options
	return code

def hasFirstFire(G, player, utype):
	uff = False
	if player in G.players:
		tech = G.players[player].technologies
		#determine first fire:
		if utype == 'AirForce' and 'Jets' in tech:
			uff = True
		elif utype == 'Infantry' and 'Rocket_Artillery' in tech:
			uff = True
		elif utype == 'Tank' and 'Heavy_Tanks' in tech:
			uff = True
		elif utype == 'Fleet' and 'Naval_Radar' in tech:
			uff = True
	return uff

def prepare_combat_structs(G, player):
	G.temp.combat = adict()
	c = G.temp.combat
	c.stages = []

	#calc optional battles for player
	battles_to_select = tset()
	for tilename in G.temp.potential_battles:
		if tilename in G.temp.battles:
			continue
		is_relevant = player in powers_present(G, G.tiles[tilename])
		if is_relevant:
			battles_to_select.add(tilename)
	c.battles_to_select = battles_to_select

	#calc battles that have to be fought and therefore are revealed
	battles_to_reveal = tdict()
	for tilename in G.temp.battles:
		if G.temp.battles[tilename] == player:
			battles_to_reveal[tilename] = player
		else:
			#print('RIESEN ERROR: new battle with another player!!!!',G.temp.battles[b])
			pass
	c.battles_to_reveal = battles_to_reveal

	#add all bettles_to_reveal to c.battles
	c.battles = adict()
	c.battles_remaining = []
	add_battles_to_reveal(G, player)
	assert len(c.battles_to_reveal.keys()) == 0, 'prepare_combat_structs: AFTER REVEALING STILL BATTLES_TO_REVEAL!'

#******************************
#           tasks             *
#******************************
def determining_next_battle(G, player, action, c):
	out = None
	head, *tail = (None, None) if not action else action

	if head == 'accept':
		#just accepted only combat available
		c.stage = 'battle'
		c.stages.append(c.stage)
		only_key = c.battles_remaining[0]
		c.battle = c.battles[only_key]
		c.battles_remaining = []
	elif head:
		#user has selected the next battle (a tile name)
		c.battle = c.battles[head]
		c.battles_remaining.remove(head)
		c.stage = 'battle'
		c.stages.append(c.stage)
	elif len(c.battles_remaining) > 1:
		out = encode_options_for_next_battle(G, player)
	else:  #there is only 1 battle
		out = encode_accept(G, player)

	return c.stage, out

def optional_battle_selection(G, player, action, c):
	#precond: c.battles_to_select up to date and non-empty
	#postcond: c.battle_to_select, c.battles up to date
	out = None
	head, *tail = (None, None) if not action else action

	if head:
		#user has selected a battle or pass
		if head == 'pass':
			c.battles_to_select.clear()
		else:
			c.battles_to_reveal[head] = player
			add_battles_to_reveal(G, player)
			c.battles_to_select.remove(head)
		head = None

	if not len(c.battles_to_select):
		if not len(c.battles):  #user did not select opt battle and no new battles
			c.stage = 'ack_combat_end'
			c.stages.append(c.stage)
		else:
			c.stage = 'next'
			c.stages.append(c.stage)
	else:
		out = encode_battles_to_select(G, player)

	return c.stage, out

def retreat_phase(G, player, action):
	pass

#******************************
#           main              *
#******************************
def combat_phase(G, player, action):
	player = G.temp.attacker

	if not 'combat' in G.temp:
		assert action == None, 'action {} but no combat in G.temp'.format(action)
		prepare_combat_structs(G, player)
		determine_stage(G, player)

	c = G.temp.combat
	head, *tail = (None, None) if not action else action

	while (True):
		if c.stage == 'opt':
			c.stage, out = optional_battle_selection(G, player, action, c)
			if out != None:
				return out

		if c.stage == 'next':
			c.stage, out = determining_next_battle(G, player, action, c)
			if out != None:
				return out

		if c.stage == 'battle':
			c.battle.stage = 'battle_start'
			c.stages.append(c.battle.stage)
			if c.battle.tile.type in {'Sea', 'Ocean'}:
				raise PhaseInterrupt('Sea Battle')  #from here will go to land_battle until PhaseComplete
			else:
				raise PhaseInterrupt('Land Battle')  #from here will go to land_battle until PhaseComplete
			break

		if c.stage == 'battle_ended':
			#remove this battle from G.temp.battles or conflicts!!!
			#if not G.tiles[c.battle.tilename].disputed:
			if c.battle.tilename in G.temp.battles:
				del G.temp.battles[c.battle.tilename]
			elif c.battle.tilename in G.temp.potential_battles:
				G.temp.potential_battles.remove(c.battle.tilename)
			determine_stage(G, player)

		if c.stage == 'combat_end':
			G.logger.write('COMBAT ENDS!')
			del G.temp.combat
			# raise PhaseComplete #wieso kommt der 2x hierher???
			break

	raise PhaseComplete  #wieso kommt der 2x hierher???

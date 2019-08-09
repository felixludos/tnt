from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete, PhaseInterrupt
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit
from tnt_util import travel_options
from government import check_revealable, reveal_tech
from structures.common import condensed_str
from battles import encode_accept

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
		#find owners of units on that tile
		owners = []
		for id in units:
			unit = G.objects.table[id]
			owner = G.nations.designations[unit.nationality]
			#print('* * * owner:', owner)
			if not owner in owners:
				owners.append(owner)

		#print('unique owners:', owners)
		if len(owners) != 2:
			#print('combat with other than 2 parties!!!!!')
			#maybe there can be 3 parties! in that case
			#if this is the defender, needs to choose who to attack
			#for now assume that there must be exactly 2 parties in a combat
			pass
		# b.intruder = c.battles_to_reveal[tile] #not sure about this!
		b.owner = b.tile.owner  #SICHER RICHTIG
		b.intruder = owners[1] if b.owner == owners[0] else owners[0]
		assert G.temp.attacker == player, 'ATTACKER != PLAYER!!!!!!'
		b.attacker = G.temp.attacker  #GANZ SICHER RICHTIG
		b.defender = owners[1] if b.attacker == owners[0] else owners[0]
		#print('owner', b.owner)
		#print('intruder', b.intruder)
		#print('attacker', b.attacker)
		#print('defender', b.defender)
		b.units = []
		for id in units:
			unit = G.objects.table[id]
			unit.visible = xset(G.players.keys())
			G.objects.updated[id] = unit

			#find owner of unit: if a unit is visible to 1, this is the owner
			#if it is visible to all, it is nations[designations]
			#simpler, for now (vielleicht geht das eh):
			#unit owner is attacker or defender
			attacker = b.attacker
			defender = b.defender
			uowner = attacker if id in G.players[attacker].units else defender
			uopponent = defender if id in G.players[attacker].units else attacker
			utype = unit.type
			ugroup = G.units.rules[utype].type
			upriority = G.units.rules[utype].priority
			udamage = G.units.rules[utype]
			uid = id
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
			if uowner == defender:
				if not u.ff and opp_has_ff:
					u.turn = 1
			else:
				if not u.ff:
					u.turn = 1

			b.units.append(u)

		b.fire_order = sorted(b.units, key=lambda u: u.priority * 10 + u.turn)
		# #moving this battle to fighting stage
		# #print('battle is added')
		# #print('battle is removed')
		# del c.battles_to_reveal[tile] NOOOOOO!!!!!!!!!!!!!!
		# #print('battles_to_reveal', c.battles_to_reveal)
		# #print('battles_to_fight', c.battles)
	c.battles_to_reveal.clear()
	#print(c.battles)

def determine_stage(G, player):
	c = G.temp.combat
	nBattles = len(c.battles_remaining)
	if len(c.battles_to_select):
		c.stage = 'opt'
	elif nBattles > 1:
		c.stage = 'next'
	elif nBattles == 1:
		c.stage = 'battle'
		only_key = c.battles_remaining[0]
		c.battle = c.battles[only_key]
		c.battles_remaining = []
		# c.battle = c.battles.popitem()[1]
	else: 
		assert nBattles == 0,'determine_stage: MATH ERROR!!!'
		c.stage = 'combat_end'

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

	#calc optional battles for player
	battles_to_select = tset()
	for b in G.temp.potential_battles:
		if b in G.temp.battles:
			continue
		tile = G.tiles[b]
		is_relevant = False
		for u in tile.units:
			owner = G.nations.designations[u.nationality]
			if owner == player:
				is_relevant = True
				break
		if is_relevant:
			battles_to_select.add(b)
	c.battles_to_select = battles_to_select

	#calc battles that have to be fought and therefore are revealed
	battles_to_reveal = tdict()
	for b in G.temp.battles:
		if G.temp.battles[b] == player:
			battles_to_reveal[b] = player
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
		only_key = c.battles_remaining[0]
		c.battle = c.battles[only_key]
		c.battles_remaining = []
		# c.battle = c.battles.popitem()[1]
	elif head:
		#user has selected the next battle (a tile name)
		c.battle = c.battles[head]
		# del c.battles[head]
		c.battles_remaining.remove(head)
		c.stage = 'battle'
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
		c.stage = 'next'
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

	while(True):
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
			if c.battle.tile.type in {'Sea', 'Ocean'}:
				raise PhaseInterrupt('Sea Battle')  #from here will go to land_battle until PhaseComplete
			else:
				raise PhaseInterrupt('Land Battle')  #from here will go to land_battle until PhaseComplete
			break

		if c.stage == 'battle_ended':
			#remove this battle from G.temp.battles
			del G.temp.battles[c.battle.tilename]
			determine_stage(G,player)

		if c.stage == 'combat_end':
			G.logger.write('COMBAT ENDS!')
			c.stage = 'ack_combat_end'
			#who is movement player?
			return encode_accept(G,c.battle.attacker)

		if c.stage == 'ack_combat_end':
			del G.temp.combat
			# raise PhaseComplete #wieso kommt der 2x hierher???
			raise PhaseComplete #wieso kommt der 2x hierher???
			break



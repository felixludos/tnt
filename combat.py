from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete, PhaseInterrupt
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit
from tnt_util import travel_options
from government import check_revealable, reveal_tech
from structures.common import condensed_str
from battles import encode_accept

def set_stage(c,stage):
	c.stage = stage
	if stage=='opt':
		pass
	elif stage =='next':
		c.present = 'battles'
		c.instruction = 'SELECT NEXT BATTLE OR ACCEPT'
	elif stage == 'fight':
		c.present = 'battle'
		c.instruction = 'ACCEPT TO START BATTLE!'
	elif stage =='done':
		pass
	elif stage =='end':
		pass

def combat_phase(G, player, action):
	player = G.temp.attacker

	if not 'combat' in G.temp:
		prepare_combat_structs(G, player)
		set_stage('opt')

	c = G.temp.combat
	head, *tail = (None, None) if not action else action
	
	if c.stage == 'opt':
		if head:
			#user has selected a battle or pass
			#action must be a tile name or pass
			if head == 'pass':
				c.battles_to_select.clear()
			else:
				c.battles_to_reveal[head]=player
				add_battles_to_reveal(G, player)
				c.battles_to_select.remove(head)
			head = None

		if not len(c.battles_to_select):
			set_stage('next')
		else:
			return encode_battles_to_select(G, player)
	
	if c.stage == 'next':
		if head == 'accept':
			#just accepted only combat available
			set_stage('fight')
			c.battle = c.battles.popitem()[1]
		elif head:
			#user has selected the next battle (a tile name)
			c.battle = c.battles[head]
			del c.battles[head]
			set_stage('fight')
		elif len(c.battles)>1:
			return encode_options_for_next_battle(G, player)
		else: #there is only 1 battle, and as soon as get accept, will set that one as c.battle!
			return encode_accept(G,player)

	if c.stage == 'fight':
		raise PhaseInterrupt('Land Battle')
		#was ist danach?
	
	if c.stage == 'done':
		#finished a battle, ready to move on to next battle
		#None,None params
		if len(c.battles) == 0:
			G.temp.past_combat = G.temp.combat
			del G.temp.combat
			G.logger.write('combat: no more battles, vor PhaseComplete: {}'.format(G.game.sequence[G.game.index]))
			raise PhaseComplete
		else:
			set_stage('next')
			return encode_accept(G,player)
	
	if c.stage == 'end':
		raise PhaseComplete

def make_unit_visible_to_all(G,id):
	unit = G.objects.table[id]
	unit.visible = xset(G.players.keys())
	G.objects.updated[id] = unit

def add_battles_to_reveal(G, player):
	#turn all units to be visible on each tile in G.temp.battles_to_reveal
	#moves revealed battles from battles_to_reveal to battles_to_fight
	print('battles are revealed...')
	c = G.temp.combat
	for tile in c.battles_to_reveal:
		units = G.tiles[tile].units
		c.battles[tile] = adict()
		b = c.battles[tile]
		b.tilename = tile
		b.tile = G.tiles[tile]
		#find owners of units on that tile
		owners = []
		for id in units:
			unit = G.objects.table[id]
			owner = G.nations.designations[unit.nationality]
			if not owner in owners:
				owners.append(owner)

		if len(owners) != 2:
			print('combat with other than 2 parties!!!!!')
			raise NotImplementedError
			#TODO: there can more than 2 parties! in that case
			#defender needs to be turned into a list
			#for now assume that there must be exactly 2 parties in a combat
		b.owner = b.tile.owner  #SICHER RICHTIG
		b.intruder = owners[1] if b.owner == owners[0] else owners[0]
		assert G.temp.attacker == player,'ATTACKER != PLAYER!!!!!!'
		b.attacker = G.temp.attacker  #GANZ SICHER RICHTIG
		b.defender = owners[1] if b.attacker == owners[0] else owners[0]
		b.units = []
		for id in units:
			make_unit_visible_to_all(G,id)

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

				#determine IND damage of Airforce:
				if utype == 'Airforce' and 'Jets' in tech:
					prec_bomb = True

				#	air defense radar:
				#Air Forces in Friendly Territory (1.14) Fire doubledice (two dice/CV) at Enemy Air
				if uowner == b.owner and utype == 'Airforce' and 'Air_Defense_Radar' in tech:
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
		#after adding units, sort to produce fire_order
		b.fire_order = sorted(b.units, key=lambda u: u.priority * 10 + u.turn)
	#after processing all battles_to_reveal > c.battles, delete this list
	c.battles_to_reveal.clear()

def determine_stage(G, player):
	c = G.temp.combat
	if len(c.battles_to_select):
		c.stage = 'opt'
	elif len(c.battles) > 1:
		c.stage = 'next'
		c.present = 'battles'
		c.instruction = 'SELECT NEXT BATTLE!'
	else:
		#in this case has to be 1 or wouldnt be in combat phase!!!
		assert len(c.battles) == 1, 'NO BATTLES!!!'
		c.stage = 'fight'
		c.battle = c.battles.popitem()[1]
		c.present = 'battle'
		c.instruction = 'ACCEPT TO START BATTLE!'

def encode_battles_to_select(G, player):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	options.add(('pass',))
	for b in G.temp.combat.battles_to_select:
		options.add((b,))
	print('* * vor code[player]=options', options)
	code[player] = options
	return code

def encode_options_for_next_battle(G, player):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	for b in G.temp.combat.battles:
		options.add((b,))
	print('* * select next battles_to_fight', options)
	code[player] = options
	return code

def hasFirstFire(G, player, utype):
	uff = False
	if player in G.players:
		tech = G.players[player].technologies
		#determine first fire:
		if utype == 'Airforce' and 'Jets' in tech:
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

	battles_to_reveal = tdict()
	for b in G.temp.battles:
		if G.temp.battles[b] == player:
			battles_to_reveal[b] = player
		else:
			print('RIESEN ERROR: new battle with another player!!!!',G.temp.battles[b])
	c.battles_to_reveal = battles_to_reveal

	c.battles = adict()
	add_battles_to_reveal(G, player)

def retreat_phase(G, player, action):
	pass

import random
from tnt_util import tdict, tlist, tset, adict, idict, xset, load

def load_card_decks(G, action_path='config/cards/action_cards.yml',
                    investment_path='config/cards/investment_cards.yml',
                    info_path='config/cards/card_info.yml'):
	
	cinfo = load(info_path)
	caction = load(action_path)
	cinvest = load(investment_path)
	
	action_cards = tdict()
	action_cards.deck = tlist()
	
	for ID, card in caction.items():
		card = idict(card)
		card.obj_type = 'action_card'
		card.visible = tset()
		card.__dict__['_id'] = 'action_{}'.format(ID)
		action_cards.deck.append(card._id)
		G.objects.table[card._id] = card
	
	investment_cards = tdict()
	investment_cards.deck = tlist()
	
	for ID, card in cinvest.items():
		card = idict(card)
		card.obj_type = 'investment_card'
		card.visible = tset()
		card.__dict__['_id'] = 'invest_{}'.format(ID)
		investment_cards.deck.append(card._id)
		G.objects.table[card._id] = card
	
	G.cards = tdict()
	
	G.cards.action = action_cards
	G.cards.action.discard_pile = tlist()
	
	G.cards.investment = investment_cards
	G.cards.investment.discard_pile = tlist()
	
	G.cards.info = cinfo
	
	shuffle(G.cards.investment)
	shuffle(G.cards.action)


def shuffle(stack):
	
	stack.deck.extend(stack.discard_pile)
	random.shuffle(stack.deck)
	
	stack.discard_pile.clear()
	
def discard_cards(G, stack, *cards):
	G.cards[stack].discard_pile.extend(cards)
	for ID in cards:
		card = G.objects.table[ID]
		if 'owner' in card:
			del card.owner
		card.visible.clear()
		G.objects.updated[ID] = card

def draw_cards(G, stack, player, N=1):
	
	assert stack in G.cards, 'Unknown stack: {}'.format(stack)
	
	cards = get_cards(G.cards[stack], N)
	
	for cID in cards:
		card = G.objects.table[cID]
		card.visible.add(player)
		card.owner = player
		G.objects.updated[cID] = card
		
	G.players[player].hand.update(cards)
	
	G.logger.write('{} draws {} {} cards (now holding {} cards)'.format(player, N, stack, len(G.players[player].hand)))

def get_cards(stack, N=1):
	cards = tlist()
	
	assert N <= len(stack.deck)+len(stack.discard_pile), 'Cannot draw {} cards from a total of {} cards'.format(N, len(stack.deck)+len(stack.discard_pile))
	
	for _ in range(N):
		if len(stack.deck) == 0:
			shuffle(stack)
		cards.append(stack.deck.pop())
		
	return cards


def split_choices(options, num, dim):
	random.shuffle(options)
	
	picks = [[] for _ in range(num)]
	indices = list(range(num))
	for name, count in options:
		
		idx = random.choice(indices, count, replace=False)
		for i in idx:
			picks[i].append(name)
			if len(picks[i]) == dim:
				indices = indices[i != indices]
	random.shuffle(picks)
	return picks

def load_gen_card_decks(G, card_config_path='config/card_stats.yml',):
	
	cc = load(card_config_path)
	
	config = cc.action_cards
	G.action_cards = adict()
	
	card_list = []
	
	dim = 2
	num = sum(config.diplomacy.values()) // dim
	
	for _ in range(10):
		try:
			picks = split_choices(list(config.diplomacy.items()), num, dim)
		except ValueError:
			pass
		else:
			break
	
	wildcards = []
	for name, info in config.wildcards.items():
		for _ in range(info.count):
			card = idict(info.items())
			del card.count
			card.name = name
			
			wildcards.append(card)
	random.shuffle(wildcards)
	
	for season, info in config.seasons.items():
		
		commands = sum([[k] * v for k, v in info.commands.items()], [])
		random.shuffle(commands)
		
		if len(info.priorities) > info.count:
			priorities = random.choice(info.priorities, info.count, replace=False).tolist()
		else:
			priorities = info.priorities
		assert len(priorities) == info.count
		
		for _ in range(info.num_wildcards):
			command, priority = commands.pop(), priorities.pop()
			wildcard = wildcards.pop()
			
			card = idict()
			card.wildcard = wildcard
			card.command_value = command
			card.command_priority = priority
			card.season = season
			
			card_list.append(card)
		
		for command, priority in zip(commands, priorities):
			dpl1, dpl2 = picks.pop()
			
			card = idict()
			card.command_value = command
			card.command_priority = priority
			card.season = season
			
			card.top_diplomacy = dpl1
			card.bottom_diplomacy = dpl2
			
			card_list.append(card)
	
	G.action_cards.deck = card_list
	
	config = cc.investment_cards
	G.investment_cards = adict()
	
	card_list = []
	
	dim = 2
	num = 0
	
	techs = []
	for name, info in config.technologies.items():
		tech = adict(info.items())
		count = info.count
		del tech.count
		num += count
		tech.name = name
		techs.append((tech, count))
	
	for name, info in config.intelligence.items():
		tech = adict(info.items())
		count = info.count
		del tech.count
		num += count
		tech.name = name
		techs.append((tech, count))
	
	num = num // dim
	
	for _ in range(10):
		try:
			picks = split_choices(techs, num, dim)
		except ValueError:
			pass
		else:
			break
	
	factories = sum([[k] * v for k, v in config.factory_levels.items()], [])
	np.random.shuffle(factories)
	
	for pick in picks:
		tech1, tech2 = pick
		card = idict()
		card.top_technology = tech1
		card.bottom_technology = tech2
		card.factory_value = factories.pop()
		
		card_list.append(card)
	
	G.investment_cards.deck = card_list
	
	G.action_cards.discard_pile = []
	G.investment_cards.discard_pile = []
	
	np.random.shuffle(G.investment_cards.deck)
	np.random.shuffle(G.action_cards.deck)
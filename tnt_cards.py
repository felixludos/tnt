import numpy as np
from tnt_util import adict, idict, xset, load

def split_choices(options, num, dim):
	np.random.shuffle(options)
	
	picks = [[] for _ in range(num)]
	indices = np.arange(num)
	for name, count in options:
		
		idx = np.random.choice(indices, count, replace=False)
		for i in idx:
			picks[i].append(name)
			if len(picks[i]) == dim:
				indices = indices[i != indices]
	np.random.shuffle(picks)
	return picks

def load_card_decks(G, card_config_path='config/card_stats.yml'):
	
	cc = load(card_config_path)
	
	config = cc.action_cards
	G.action_cards = adict()

	card_list = []

	dim = 2
	num = sum(config.diplomacy.values())//dim
	
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
	np.random.shuffle(wildcards)


	for season, info in config.seasons.items():

		commands = sum([[k] * v for k, v in info.commands.items()], [])
		np.random.shuffle(commands)

		if len(info.priorities) > info.count:
			priorities = np.random.choice(info.priorities, info.count, replace=False).tolist()
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
	

def shuffle(stack):
	
	stack.deck.extend(stack.discard_pile)
	np.random.shuffle(stack.deck)
	
	stack.discard_pile = []
	

def draw_cards(stack, N=1):
	cards = []
	
	N = min(N, len(stack.deck)+len(stack.discard_pile))
	
	shuffled = False
	
	for _ in range(N):
		if len(stack.deck) == 0:
			shuffled = True
			shuffle(stack)
		cards.append(stack.deck.pop())
		
	return cards, shuffled


import numpy as np
from tnt_util import xdict, xset, load

def split_choices(options, num, dim):
	np.random.shuffle(options)
	
	#print(num, dim)
	
	picks = [[] for _ in range(num)]
	indices = np.arange(num)
	for name, count in options:
		#print(name, count, list(map(len,picks)))# indices)
		
		idx = np.random.choice(indices, count, replace=False)
		for i in idx:
			picks[i].append(name)
			if len(picks[i]) == dim:
				indices = indices[i != indices]
	np.random.shuffle(picks)
	return picks

def create_card_decks(G, card_config_path='config/card_stats.yml'):
	
	cc = load(card_config_path)
	
	config = cc.action_cards
	G.action_cards = xdict()

	card_list = []

	dim = 2
	num = sum(config.diplomacy.values())//dim
	picks = split_choices(list(config.diplomacy.items()), num, dim)


	wildcards = []
	for name, info in config.wildcards.items():
		for _ in range(info.count):
			card = xdict(info.items())
			del card.count
			card.name = name

			wildcards.append(card)
	np.random.shuffle(wildcards)


	for season, info in config.seasons.items():

		commands = sum([[k] * v for k, v in info.commands.items()], [])
		np.random.shuffle(commands)
		#commands = commands.tolist()

		if len(info.priorities) > info.count:
			priorities = np.random.choice(info.priorities, info.count, replace=False).tolist()
		else:
			priorities = info.priorities
		assert len(priorities) == info.count

		for _ in range(info.num_wildcards):
			command, priority = commands.pop(), priorities.pop()
			wildcard = wildcards.pop()

			card = xdict()
			card.wildcard = wildcard
			card.command_value = command
			card.command_priority = priority

			card_list.append(card)


		for command, priority in zip(commands, priorities):
			dpl1, dpl2 = picks.pop()

			card = xdict()
			card.command_value = command
			card.command_priority = priority

			card.top_diplomacy = dpl1
			card.bottom_diplomacy = dpl2

			card_list.append(card)

	G.action_cards.cards = card_list

	
	config = cc.investment_cards
	G.investment_cards = xdict()
	
	card_list = []
	
	dim = 2
	num = 0
	
	techs = []
	for name, info in config.technologies.items():
		
		tech = xdict(info.items())
		count = info.count
		del tech.count
		num += count
		tech.name = name
		techs.append((tech, count))
	
	for name, info in config.intelligence.items():
		tech = xdict(info.items())
		count = info.count
		del tech.count
		num += count
		tech.name = name
		techs.append((tech, count))
		
	#print(num)
	
	num = num // dim
	
	#print(len(techs), num, dim)
	
	picks = split_choices(techs, num, dim)
	
	factories = sum([[k] * v for k, v in config.factory_levels.items()], [])
	#print(len(factories))
	np.random.shuffle(factories)
	
	#print(len(factories), len(picks))
		
	for pick in picks:
		
		#print(pick)
		tech1, tech2 = pick
		card = xdict()
		card.top_technology = tech1
		card.bottom_technology = tech2
		card.factory_value = factories.pop()
	
	G.investment_cards.cards = card_list
	
	
	G.action_cards.discard_pile = []
	G.investment_cards.discard_pile = []
	

def shuffle(G, actioncards=True):
	pass

def draw_cards(G, N=1, actioncards=True):
	pass




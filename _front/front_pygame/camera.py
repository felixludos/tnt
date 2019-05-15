import pygame as pg
from _front.front_pygame.pygame_settings import *

'''
Class that represents the camera, which allows the player to move
around their view of the map.
'''


class Camera:
    def __init__(self, game, width, height):
        self.camera = pg.Rect(0, 0, width, height)
        self.game = game
        self.width = width
        self.height = height
        self.zoom_level = 1.0

    def update_map(self, width, height):
        self.width = width
        self.height = height

    def update(self, target):
        # calculate offset based on how much the player has moved
        x = -target.rect.x + int(WIN_WIDTH/2)
        y = -target.rect.y + int(WIN_HEIGHT/2)

        # limit scrolling to map size
        x = min(0, x)
        y = min(0, y)
        x = max(-(self.width - WIN_WIDTH), x) # Right
        y = max(-(self.height - WIN_HEIGHT), y) # Bottom

        self.camera = pg.Rect(x, y, self.width, self.height)

    def zoom_out(self, target):
        """ Zooming functionality - scales down the target. """
        new_zoom_level = self.zoom_level - ZOOM_SPEED
        if new_zoom_level < ZOOM_OUT_CAP:
            new_zoom_level = self.zoom_level
        if isinstance(target, pg.Rect):
            new_width = int(round((target.width / self.zoom_level) * new_zoom_level))
            new_height = int(round((target.height / self.zoom_level) * new_zoom_level))
        else:
            new_width = int(round(target.get_width() * new_zoom_level))
            new_height = int(round(target.get_height() * new_zoom_level))
        # check for zooming out too far, beyond map bounds
        if new_width < self.game.width or new_height < self.game.height:
            new_width = self.game.width
            new_height = self.game.height
        target = pg.transform.smoothscale(target, (new_width, new_height))
        self.zoom_level = new_zoom_level
        return target

    def zoom_in(self, target):
        """ Zooming functionality - scales up the target. """
        new_zoom_level = self.zoom_level + ZOOM_SPEED
        if new_zoom_level > ZOOM_IN_CAP:
            new_zoom_level = self.zoom_level
        if isinstance(target, pg.Rect):
            new_width = int(round((target.width / self.zoom_level) * new_zoom_level))
            new_height = int(round((target.height / self.zoom_level) * new_zoom_level))
        else:
            new_width = int(round(target.get_width() * new_zoom_level))
            new_height = int(round(target.get_height() * new_zoom_level))
        if new_width < self.game.width or new_height < self.game.height:
            new_width = self.game.width
            new_height = self.game.height
        target = pg.transform.smoothscale(target, (new_width, new_height))
        self.zoom_level = new_zoom_level
        return target

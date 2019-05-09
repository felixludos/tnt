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

    def update_map(self, width, height):
        self.width = width
        self.height = height

    # Shift a target entity
    def apply(self, entity):
        if isinstance(entity, pg.Rect):
            return entity.move(self.camera.topleft)
        return entity.rect.move(self.camera.topleft)

    def apply_rect(self, rect):
        return rect.move(self.camera.topleft)

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
        target.width = target.width - ZOOM_SPEED
        target.height = target.height - ZOOM_SPEED
        return target

    def zoom_in(self, target):
        """ Zooming functionality - scales up the target. """
        target.width = target.width + ZOOM_SPEED
        target.height = target.height + ZOOM_SPEED
        return target

# -*- coding: utf-8 -*-

import os
import base64

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError

DEFAULT_THEME_CONFIG_PATH = 'static/src/scss/themes'
THEME_CONFIG = '''$body_background_color: {body_background_color};
$header_background_color: {header_background_color};
$theme_color: {theme_color};
$hover_color: {hover_color};
$highlight_color: {highlight_color};
$primary_button_color: {primary_button_color};
$notification_color: {notification_color};
$label_color: {label_color};
$font_name: {font_name};
'''


class WebBackendTheme(models.Model):
    _name = "web.backend.theme"
    _description = "Backend Theme"
    _rec_name = 'name'

    name = fields.Char('Name')
    body_background_color = fields.Char("Body", default="#FFFFFF")
    header_background_color = fields.Char("Header", default="#585a61")
    theme_color = fields.Char("Sidebar", default="#585a61")
    hover_color = fields.Char("Submenu", default="#4c4b5e")
    highlight_color = fields.Char("Menu Hover", default="#e87162")
    primary_button_color = fields.Char("Primary Button", default="#585a61")
    notification_color = fields.Char("Notification", default="#da9b49")
    label_color = fields.Char("Label Color", default="#000000")


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    app_background_image = fields.Binary(
        "App Background Image",
        related='company_id.app_background_image', readonly=False)
    app_background_color = fields.Char(
        "App Background Color",
        related="company_id.app_background_color", readonly=False)
    is_app_background_color = fields.Boolean(
        "Show App Background Color",
        related="company_id.is_app_background_color", readonly=False)

    is_sidebar_bg_img = fields.Boolean(
        "Show Sidebar Background Image",
        related='company_id.is_sidebar_bg_img', default=False, readonly=False)
    bg_img = fields.Binary(
        "Sidebar Background Image", related='company_id.bg_img', readonly=False)

    select_theme = fields.Many2one('web.backend.theme', string="Theme", readonly=False)
    select_theme_id = fields.Selection('_get_selected_theme', string="Choose Theme", readonly=False)

    menu_style = fields.Selection([
        ('apps', 'Top Menu'),
        ('sidemenu', 'Side Collapse Menu'),
        ('fullmenu', 'Side Expand Menu')
    ], string="Menu Style", default="sidemenu", related='company_id.menu_style', readonly=False)
    font_name = fields.Selection([
        ('inherit', 'Default'),
        ('Open Sans Light', 'Open Sans Light'),
        ('"Roboto", sans-serif', 'Roboto'),
        ('Open Sans', 'Open Sans'),
        ('monospace', 'Monospace'),
        ('serif', 'Serif')
    ], string="Select Font", default='inherit', related='company_id.font_name', readonly=False)
    button_style = fields.Selection([
        ('default_button_odoo', 'Default'),
        ('corner_button_odoo', 'Corner'),
        ('thin_button_odoo', 'Thin'),
        ('round_button_odoo', 'Round')
    ], default="default_button_odoo", string="Button Style",
        related="company_id.button_style", readonly=False)
    tabs_style = fields.Selection([
        ('horizontal', 'Horizontal Tab'),
        ('vertical', 'Vertical Tab')
    ], string="Tabs Style", default='horizontal', related="company_id.tabs_style", readonly=False)
    icon_style = fields.Selection([
        ('default_odoo_icon', 'Default'),
        ('3d_odoo_icon', '3D Icon'),
    ], string="Icon Bundle", default="default_odoo_icon",
        related="company_id.icon_style", readonly=False)
    is_dark_mode = fields.Boolean(
        string="Enabled Night Mode", related="company_id.is_dark_mode", readonly=False)

    @api.onchange('select_theme_id')
    def _onchange_select_theme_id(self):
        self.select_theme = self.select_theme_id

    @api.onchange('select_theme')
    def _onchange_select_theme(self):
        self.select_theme_id = self.select_theme.id

    @api.model
    def _get_selected_theme(self):
        themes = []
        themes_ids = self.env['web.backend.theme'].search([])
        for theme_id in themes_ids:
            themes.append((theme_id.id, theme_id.name))
        return themes

    def update_theme_color(self):
        self.env['ir.config_parameter'].sudo().set_param(
            "odoo_shoppe_backend_theme.selected_theme", self.select_theme.id or False)

        modulePath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        assetPath = os.path.join(modulePath, DEFAULT_THEME_CONFIG_PATH, 'variable.scss')
        F = open(assetPath, 'w')
        theme = THEME_CONFIG.format(
            body_background_color=self.select_theme.body_background_color or '#FFFFFF',
            header_background_color=self.select_theme.header_background_color or '#585a61',
            theme_color=self.select_theme.theme_color or '#585a61',
            hover_color=self.select_theme.hover_color or '#4c4b5e',
            highlight_color=self.select_theme.highlight_color or '#e87162',
            primary_button_color=self.select_theme.primary_button_color or '#585a61',
            notification_color=self.select_theme.notification_color or '#da9b49',
            label_color=self.select_theme.label_color or '#000000',
            font_name=str(self.company_id.font_name) or 'inherit',)
        F.write(theme)
        F.close()

    def update_menu_icon(self):
        menus = self.env['ir.ui.menu'].search([('parent_id', '=', False)])
        if self.icon_style == '3d_odoo_icon':
            modulePath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            for menu in menus:
                menu_image = os.path.join(
                    modulePath, 'static/src/img/3d_icons', '%s.png' % menu.name)
                if os.path.exists(menu_image):
                    with open(menu_image, "rb") as img_file:
                        menu.web_icon_data = base64.b64encode(img_file.read())
        if self.icon_style == 'default_odoo_icon':
            for menu in menus:
                menu.web_icon_data = menu.read_image(menu.web_icon)

    def set_values(self):
        self.ensure_one()
        if self.select_theme:
            self.update_theme_color()
        if self.icon_style:
            self.update_menu_icon()

    @api.model
    def get_values(self):
        params = self.env['ir.config_parameter'].sudo()
        res = super(ResConfigSettings, self).get_values()
        res.update({
            'select_theme': int(
                params.get_param('odoo_shoppe_backend_theme.selected_theme'), False),
            'select_theme_id': int(
                params.get_param('odoo_shoppe_backend_theme.selected_theme'), False),
        })
        return res

    def action_new_theme_create(self):
        return {
                'name': _('Create New Theme'),
                'type': 'ir.actions.act_window',
                'view_type': 'form',
                'view_mode': 'form',
                'res_model': 'web.backend.theme',
                'target': 'new',
            }

    def action_update_theme(self):
        return {
                'name': _('Edit Theme'),
                'type': 'ir.actions.act_window',
                'view_type': 'form',
                'view_mode': 'form',
                'res_id': self.select_theme.id,
                'res_model': 'web.backend.theme',
                'target': 'new',
            }

    def action_delete_theme(self):
        if self.select_theme and self.select_theme_id:
            WBT = self.env['web.backend.theme']
            first_theme = WBT.search([('id', '!=', self.select_theme.id)], limit=1)
            if not first_theme:
                raise ValidationError(_("You can not delete your last theme."))

            delete_theme = WBT.search([('id', '=', self.select_theme.id)], limit=1)

            # Assign first theme color before delete selected theme
            self.select_theme = first_theme
            if self.select_theme:
                self.update_theme_color()

            delete_theme.unlink()

        return {
            'type': 'ir.actions.client',
            'tag': 'reload',
        }

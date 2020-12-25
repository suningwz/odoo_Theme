odoo.define('odoo_shoppe_backend_theme.theme_scripts', function (require) {
"use strict";

require('web.dom_ready');
var core = require('web.core');
var config = require('web.config');

var rpc = require('web.rpc');
var session = require('web.session');

var Menu = require('web.Menu');
var UserMenu = require('web.UserMenu');
var SystrayMenu = require('web.SystrayMenu');
var AppsMenu = require("web.AppsMenu");

var dom = require('web.dom');
var WebClient = require('web.WebClient');
var AbstractWebClient = require('web.AbstractWebClient');
var ActionManager = require('web.ActionManager');
var ControlPanelRenderer = require('web.ControlPanelRenderer');

var BasicRenderer = require('web.BasicRenderer');
var FormRenderer = require('web.FormRenderer');
var ListRenderer = require('web.ListRenderer');

var field_registry = require('web.field_registry');
var relational_fields = require('web.relational_fields');
var FieldRadio = field_registry.get('radio');

var _t = core._t;
var qweb = core.qweb;

var FieldChar = field_registry.get('char');
var FieldColorPicker = FieldChar.extend({
    template: 'FieldColorPicker',
    widget_class: 'oe_form_field_color',
    _renderReadonly: function () {
        var show_value = this._formatValue(this.value);
        this.$el.text(show_value);
        this.$el.css("background-color", show_value);
    },
    _getValue: function () {
        var $input = this.$el.find('input');
        return $input.val();
    },
    _renderEdit: function () {
        var show_value = this.value ;
        var $input = this.$el.find('input');
        $input.val(show_value);
        this.$el.colorpicker({format: 'rgba'});
        this.$input = $input;
    }
});
field_registry.add('colorpicker', FieldColorPicker);

AbstractWebClient.include({
    set_action_manager: function () {
        var self = this;
        this.action_manager = new ActionManager(this, session.user_context);
        var fragment = document.createDocumentFragment();
        return this.action_manager.appendTo(fragment).then(function () {
            dom.append(self.$el.find('.o_main'), fragment, {
                in_DOM: true,
                callbacks: [{widget: self.action_manager}],
            });
        });
    },
});

ActionManager.include({
    _appendController: function () {
        this._super.apply(this, arguments);
        if (!config.device.isMobile) {
            var scrollArea = this.$el.find(".o_content");
            this.$el.find('table.o_list_table').each(function() {
                $(this).stickyTableHeaders({
                    scrollableArea: scrollArea, fixedOffset: 0.1, zIndex: 1
                });
                $(this).closest('.table-responsive').scroll(function() {
                    $(this).trigger('resize.stickyTableHeaders');
                });
            });
        }
    }
});

WebClient.include({
    events: _.extend({}, WebClient.prototype.events, {
        'click .oe_logo_edit_admin': 'logo_edit',
    }),
    instanciate_menu_widgets: function () {
        var self = this;
        var defs = [];
        return this.load_menus().then(function (menuData) {
            self.menu_data = menuData;
            if (self.menu) {
                self.menu.destroy();
            }
            self.menu = new Menu(self, menuData);
            rpc.query({
                model: 'res.company', method: 'read',
                args: [[session.company_id], ['menu_style']]
            }).then(function (res) {
                if(res[0].menu_style == 'sidemenu' || res[0].menu_style == 'fullmenu') {
                     defs.push(self.menu.prependTo(self.$el));
                    $('.o_menu_apps, .o_menu_brand, .o_menu_sections').remove();
                    self.$el.find('header').find('ul.o_menu_systray').find('li.o_user_menu').remove();
                } else {
                    defs.push(self.menu.prependTo(self.$el));
                }
                self.update_logo();
                return $.when.apply($, defs);
            });
        });
    },
    show_application: function() {
        var self = this;
        var res = this._super.apply(this, arguments);
        // Create the user Left
        self.user_left = new LeftUserMenu(self);
        var user_left_loaded = self.user_left.appendTo(this.$el.find('.o_sub_menu div.user'));
    },
    update_logo: function(reload) {
        var company = session.company_id;
        var img = session.url('/web/binary/company_logo' + '?db=' + session.db + (company ? '&company=' + company : ''));
        setTimeout(function () {
            $('.o_sub_menu_logo img').attr('src', '').attr('src', img + (reload ? "&t=" + Date.now() : ''));
            $('.oe_logo_edit').toggleClass('oe_logo_edit_admin', session.is_admin);
        }, 2000);
    },
    logo_edit: function(ev) {
        var self = this;
        ev.preventDefault();
        self._rpc({
                model: 'res.users',
                method: 'read',
                args: [[session.uid], ['company_id']],
            })
            .then(function(data) {
                self._rpc({
                        route: '/web/action/load',
                        params: { action_id: 'base.action_res_company_form' },
                    })
                    .then(function(result) {
                        result.res_id = data[0].company_id[0];
                        result.target = "new";
                        result.views = [[false, 'form']];
                        result.flags = {
                            action_buttons: true,
                            headless: true,
                        };
                        self.action_manager.do_action(result, {
                            on_close: self.update_logo.bind(self, true),
                        });
                    });
            });
        return false;
    },
});

var LeftUserMenu =  UserMenu.extend({
    template: "UserLeft",
    events: {
    },
    init: function(parent) {
        this._super(parent);
        this.systray_menu = new SystrayMenu(this);
    },
    start : function(){
        var self = this;
        this._super();
        this.systray_menu.attachTo(this.$('.o_menu_systray_ap')).then(function() {
            if(self.$el.find('ul.o_menu_systray_ap').length > 0){
                $.each(self.$el.find('ul.o_menu_systray_ap li'), function(index, val){
                    if($(val).hasClass('o_switch_company_menu') || $(val).hasClass('o_user_menu')){
                        $(val).remove();
                    }
                });
            }
        });

    },
});

AppsMenu.include({
    init: function (parent, menuData) {
        this._super.apply(this, arguments);
        $.each(this._apps, function(index, value) {
            value.web_icon_data = 'data:image/png;base64,' + menuData.children[index].web_icon_data;
        });
    },
    start: function () {
        WebClient.prototype.update_logo();
        rpc.query({
            model: 'res.company', method: 'read',
            args: [[session.company_id], ['bg_img', 'menu_style', 'is_sidebar_bg_img', 'app_background_image', 'is_app_background_color', 'app_background_color']]
        }).then(function (res) {
            if (res[0].menu_style == 'apps'){
                if(res[0].is_app_background_color){
                    $('.o_menu_apps li.dropdown div.dropdown-menu').attr(
                    "style", "background-color:"+res[0].app_background_color+";"+"border-color:"+res[0].app_background_color+";"
                    );
                }else{
                   $('.o_menu_apps li.dropdown div.dropdown-menu').attr(
                    "style", "background: url('/web/image/res.company/" + session.company_id + "/bg_img') center center fixed; background-size: cover;"
                    );
                }
            }
            if(res[0].menu_style == 'sidemenu' || res[0].menu_style == 'fullmenu'){
                $('.o_menu_apps, .o_menu_brand').remove();
                if(res[0].is_sidebar_bg_img == true){
                    $('body').attr("style", "background: url('/web/image/res.company/" + session.company_id + "/app_background_image') center center fixed; background-size: cover;");
                    $('body').addClass('cover_bg');
                }
                if($('header').find('ul.o_menu_systray').length > 0){
                    $.each($('header').find('ul.o_menu_systray li'), function(index, val){
                        if($(val).hasClass('o_mail_systray_item') || $(val).hasClass('o_debug_manager') || $(val).hasClass('o_user_menu')){
                            $(val).remove();
                        }
                    });
                    $('header').find('.o_menu_sections').remove();
                }
            }
        });
        return this._super.apply(this, arguments);
    },
});

var FieldColorRadio = FieldRadio.extend({
    template: null,
    init: function () {
        this._super.apply(this, arguments);
    },
    _renderEdit: function () {
        var self = this;
        var currentValue;
        if (this.field.type === 'many2one') {
            currentValue = this.value && this.value.data.id;
        } else {
            currentValue = this.value;
        }
        this.$el.empty();
        var model = self.field.relation;
        self._rpc({
                model: model,
                method: 'search_read',
            }).then(function(datas) {
                self.$el.empty();
                var datas = datas;
                _.each(self.values, function (value, index) {

                    self.$el.append(qweb.render('FieldRadio.Color.Button', {
                        checked: value[0] === currentValue,
                        id: self.unique_id + '_' + value[0],
                        index: index,
                        value: value,
                        datas: self.get_theme_color_datas(datas, value[0]),
                    }));
             });
        });
    },
    get_theme_color_datas: function(datas, value){
        var val_datas = null;
        _.each(datas, function(val_data, index) {
            if(value == val_data.id){
                val_datas = val_data;
                return false;
            }
        });
        return val_datas;
    },
});
field_registry.add('color_radio', FieldColorRadio);

ControlPanelRenderer.include({
    _renderBreadcrumbsItem: function (bc, index, length) {
        var def = this._super.apply(this, arguments);
        def.toggleClass('d-none d-md-inline-block', !(index === length-1) && !(index === length-2))
            .toggleClass('btn btn-secondary', (index === length-2) && config.device.isMobile)
            .toggleClass('o_back_button', (index === length-2));
        return def;
    },
});

FormRenderer.include({
    _renderAccordionHeader: function (page, page_id) {
        var $div = $('<div>', {
            'class': "panel-heading accordion-toggle collapsed",
            'data-toggle': "collapse",
            'data-parent': "#NotebookAccordion",
            'data-target': "#" + page_id,
        });
        var $h4 = $('<h4 class="panel-title"><i class="fa fa-plus" aria-hidden="false"></i><span>' + page.attrs.string + '</span></h4>');
        return $($div).append($h4);
    },
    _renderAccordionBody: function (page, page_id) {
        var $accordion_pre = $('<div id="' + page_id +'" class="panel-collapse collapse"></div');
        var $accordion_body = $('<div class="panel-body"></div>');

        var $result = $accordion_body.append(_.map(page.children, this._renderNode.bind(this)));
        return $($accordion_pre).append($result);
    },
    _renderTagNotebookVertical: function(node){
        var self = this;
        var $pages = $('<div class="panel-group" id="NotebookAccordion"></div>');
        var renderedTabs = _.map(node.children, function (child, index) {
            var pageID = _.uniqueId('notebook_page_');
            var $container = $('<div class="panel panel-default "></div');
            var $pagehead = self._renderAccordionHeader(child, pageID);
            var $pagebody = self._renderAccordionBody(child, pageID);
            var $page = $($container).append($pagehead, $pagebody);
            $pages.append($page);

            return {
                $page: $page,
                node: child,
            };
        });
        var $notebook = $('<div class="o_notebook">')
                .data('name', node.attrs.name || '_default_')
                .append($pages);

        this._registerModifiers(node, this.state, $notebook);
        this._handleAttributes($notebook, node);
        $notebook.find('.accordion-toggle').first().removeClass('collapsed');
        $notebook.find('.accordion-toggle').first().find('.fa-plus').removeClass('fa-plus').addClass('fa-minus');
        $notebook.find('.panel-collapse.collapse').first().addClass('show');

        $notebook.find('.panel-title').click(function() {
            if ($(this).find('i').hasClass('fa-plus'))
                $(this).find('i').addClass('fa-minus').removeClass('fa-plus');
            else
                $(this).find('i').addClass('fa-plus').removeClass('fa-minus');
        });
        return $notebook;
    },
    _renderTagNotebook: function (node) {
        var self = this;
        if(session.tabs_style == 'vertical'){
            return self._renderTagNotebookVertical(node);
        }
        return this._super.apply(this, arguments);
    },
    _renderHeaderButtons: function (node) {
        if (config.device.isMobile) {
            var self = this;
            var $headerbtn;
            var buttons = [];
            _.each(node.children, function (child) {
                if (child.tag === 'button') {buttons.push(self._renderHeaderButton(child));}
                if (child.tag === 'widget') {buttons.push(self._renderTagWidget(child));}
            });
            if (buttons.length) {
                $headerbtn = $(qweb.render('StatusbarButtons'));
                var $dropdownMenu = $headerbtn.find('.dropdown-menu');
                _.each(buttons, function ($button) {
                    $dropdownMenu.append($button.addClass('dropdown-item'));
                });
                var $visiblebtn = $headerbtn.find('.dropdown-menu button:not(.o_invisible_modifier)');
                $visiblebtn = $visiblebtn.filter((index, element) => {
                    return !(this.mode === 'edit' && element.matches('.oe_read_only'));
                });
                $headerbtn.toggleClass('o_invisible_modifier', !$visiblebtn.length);
            }
            return $headerbtn;
        } else {
            return this._super.apply(this, arguments);
        }
    },
    _updateAllModifiers: function () {
        if (config.device.isMobile) {
            var def = this._super.apply(this, arguments);
            var $visiblebtn = this.$('.o_statusbar_buttons').find('.dropdown-menu button:not(.o_invisible_modifier)');
            $visiblebtn = $visiblebtn.filter((index, element) => {
                return !(this.mode === 'edit' && element.matches('.oe_read_only'));
            });
            this.$('.o_statusbar_buttons').toggleClass('o_invisible_modifier', !$visiblebtn.length);
            return def;
        } else {
            return this._super.apply(this, arguments);
        }
    },
});
ListRenderer.include({
    _onToggleOptionalColumnDropdown: function (ev) {
        // The dropdown toggle is inside the overflow hidden container because
        // the ellipsis is always in the last column, but we want the actual
        // dropdown to be outside of the overflow hidden container since it
        // could easily have a higher height than the table. However, separating
        // the toggle and the dropdown itself is not supported by popper.js by
        // default, which is why we need to toggle the dropdown manually.
        $('.o_optional_columns a').trigger('click');
        $('.o_optional_columns').toggleClass('show');
    },
});

var FieldStatus = relational_fields.FieldStatus;
FieldStatus.include({
    _render: function () {
        if (config.device.isMobile) {
            this.$el.html(qweb.render("FieldStatusDropdown", {
                selection: this.status_information,
                status: _.findWhere(this.status_information, {selected: true}),
                clickable: this.isClickable,
            }));
        } else {
            return this._super.apply(this, arguments);
        }
    },
});

Menu.include({
    _updateMenuBrand: function (brandName) {
        if (brandName) {
            this.$menu_brand_placeholder.text(brandName).show();
            // Prevent to show below menu in open for mobile view.
            // this.$section_placeholder.show();
        } else {
            this.$menu_brand_placeholder.hide()
            this.$section_placeholder.hide();
        }
    },
    openFirstApp: function () {
        if (this._appsMenu != undefined) {
            this._appsMenu.openFirstApp();
        }
    },
});

$(document).ready(function(){
    $('.cssmenu > h3').click(function() {
        $('.cssmenu h3').removeClass('active');
        $('.cssmenu .oe_menu_toggler').removeClass('active');
        $(this).closest('h3').addClass('active');
        var checkElement = $(this).next();
        if((checkElement.is('.oe_secondary_menu')) && (checkElement.is(':visible'))) {
            $(this).closest('h3').removeClass('active');
            checkElement.slideUp(400);
        }
        if((checkElement.is('.oe_secondary_menu')) && (!checkElement.is(':visible'))) {
            $('.cssmenu .oe_secondary_menu').slideUp(10);
            $('#cssmenu h3:visible').slideUp(400);
            checkElement.slideDown(400);
            var cssmenu = $(this).parent();
            $('.o_sub_menu_content').animate({ scrollTop: $(cssmenu).position().top - 46}, 500);
        }
    });

    $('.cssmenu > h3').hover(function () {
        if ($('.o_sub_menu.fix_icon_width').is(":visible")) {
            var leftpanel = $('.o_sub_menu.fix_icon_width').position().top;
            var menu = $(this).position().top;
            var total_top = leftpanel + menu + 40;
            $(this).next().addClass('iconic_menu');
            $(this).next('.iconic_menu.oe_secondary_menu').css({'top' : 135 + 'px', 'bottom': 2});
        }
    });

    $('.cssmenu .oe_menu_toggler').click(function(ev) {
        $('.cssmenu .oe_menu_toggler').removeClass('active');
        $(this).closest('.oe_menu_toggler').addClass('active');
        var checkElement = $(this).next();
        if((checkElement.is('.oe_secondary_submenu')) && (checkElement.is(':visible'))) {
            $(this).closest('.oe_menu_toggler').removeClass('active');
            checkElement.slideUp(400);
        }
        if((checkElement.is('.oe_secondary_submenu')) && (!checkElement.is(':visible'))) {
            $('#cssmenu .oe_menu_toggler:visible').slideUp(400);
            checkElement.slideDown(400);
        }
        return false;
    });
    
    $('.o_sub_menu_content').find('.oe_menu_toggler').siblings('.oe_secondary_submenu').hide();
    
    $('.oe_secondary_submenu li a.oe_menu_leaf').click(function() {
        if ($(this).parent().hasClass('active')) {
            window.location.reload();
        } else {
            $('.oe_secondary_submenu li').removeClass('active');
            $(this).parent().addClass('active');
        }
        var $secondary_menu = $(this).closest('.oe_secondary_menu');
        if ($secondary_menu.hasClass('iconic_menu')) {
            $secondary_menu.removeClass('iconic_menu');
        }

        if (config.device.isMobile) {
            $('.o_sub_menu').toggle();
        }
    });

    function SidemenuEvent() {
        $(".o_sub_menu.sidemenu > .o_sub_menu_content").mouseleave(function(argument) {
           $(this).parent().addClass('mobile_views_menu');
           $('.cssmenu h3').removeClass('active');
           $('.oe_secondary_menu').css({'display':'none'});
           $('.o_sub_menu_content').find('.oe_menu_toggler').removeClass('active');
           $('.o_sub_menu_content').find('.oe_menu_toggler').siblings('.oe_secondary_submenu').hide();
           $('.tableFloatingHeaderOriginal').removeClass('tableheaderright');
        });
        $(".o_sub_menu.sidemenu > .o_sub_menu_content").mouseover(function (argument) {
            $(this).parent().removeClass('mobile_views_menu');
            $('.tableFloatingHeaderOriginal').addClass('tableheaderright');
        });
    }

    // Find left menu collapsed then set collapse width
    var $window = $(window);
    function checkWidth() {
        var windowsize = $window.width();
        var $leftbar = $('.fullmenu');
        if (windowsize < 768) {
            if ($leftbar.length > 0) {
                $leftbar.removeClass('fullmenu').addClass('mobile_views_menu sidemenu');
                $leftbar.hide();
            }
        } else {
            // Desktop Size
        }

        // Toogle sidebar menu
        $(".sidebar_side_menu_toggle").click(function(argument) {
            $('.o_sub_menu').toggle();
        });

        // Vertical tab view icon plus minus change
        $('#NotebookAccordion .collapse').on('shown.bs.collapse', function(){
            $(this).parent().find(".fa-plus").removeClass("fa-plus").addClass("fa-minus");
        }).on('hidden.bs.collapse', function(){
            $(this).parent().find(".fa-minus").removeClass("fa-minus").addClass("fa-plus");
        });

        SidemenuEvent();
    }

    // wait until render all menu
    setTimeout(function(){
        checkWidth();
    }, 1800);
    $(window).resize(checkWidth);

    SidemenuEvent();
});

return {
    FieldColorRadio: FieldColorRadio
};

});

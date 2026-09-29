import '@scss/main.scss';
import * as myFunctions from '@js/modules/functions.js';
import * as myScroll from '@js/modules/scroll/scroll.js';
import '@js/site.js';

myFunctions.initAnalytics();
myFunctions.initBurgerMenu();
myFunctions.initNavMenuActivate();
myFunctions.initForms();
myFunctions.initWatcher();
myFunctions.initHeaderScroll();

import '@js/modules/popup.js';
import '@js/modules/dynamic-adapt/dynamic-adapt.js';

myScroll.pageNavigation();

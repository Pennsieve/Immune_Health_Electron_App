import Vue from 'vue'
import App from './app.vue'
import * as svgicon from 'vue-svgicon'
import router from '@/router'
import store from '@/store'
import ElementUI from 'element-ui'
import vOutsideEvents from 'vue-outside-events'
import striptags from 'striptags';
import 'element-ui/lib/theme-chalk/index.css';
import '@/assets/index'
import {
  Tooltip
} from 'element-ui'

Vue.prototype.$sanitize = (html, allowedTags=['br']) => striptags(html, allowedTags)

Vue.config.productionTip = false

Vue.use(ElementUI)

Vue.use(vOutsideEvents)

Vue.use(svgicon, {
  tagName: 'svg-icon'
})

Vue.use(Tooltip)

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app')

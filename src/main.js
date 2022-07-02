import Vue from 'vue'
import App from './app.vue'
import * as svgicon from 'vue-svgicon'
import router from '@/router'
import store from '@/store'
import ElementUI from 'element-ui'
import vOutsideEvents from 'vue-outside-events'
import 'element-ui/lib/theme-chalk/index.css';
import '@/assets/index'

Vue.config.productionTip = false

Vue.use(ElementUI)

Vue.use(vOutsideEvents)

Vue.use(svgicon, {
  tagName: 'svg-icon'
})

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app')

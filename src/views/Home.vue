<template>
  <div>
    <ih-subheader class="subheader">
      <span slot="text">
        Applications
      </span>
      <template slot="buttons">
        <bf-button>
          <a href="https://docs.pennsieve.io/page/penn-immune-health-app" target="_blank">
            Documentation
          </a>
        </bf-button>
        <bf-button>
          <a href="http://app.pennsieve.io" target="_blank">
            Visit Pennsieve
          </a>
        </bf-button>
      </template>
    </ih-subheader>
    <div class="page-content">
      <div class="logo-container">
        <span>
          <router-link to="/studies" exact>
            <img
              src="@/assets/images/browse-data.png"
              class="logo"
            />
            <div>
              Browse
            </div>
            <div>
              Studies
            </div>
          </router-link>
        </span>
        <span>
          <router-link to="/file-upload" exact>
              <img
                src="@/assets/images/upload-files.png"
                class="logo"
              />
              <div>
                Upload
              </div>
              <div>
                Data
              </div>
          </router-link>
        </span>
      </div>

    </div>
    <div>
    <hr>
    <br>
    <h1 class="orgtext">Immune Health Organization Activity</h1>
        <div v-if="userToken" class="orgtext">
           <org-activity/>
        </div>
        <div v-else class="orgtext">
          <h3>Please sign in to view organization activity</h3>
        </div>
    </div>
  </div>
</template>

<script>
import IhSubheader from '@/components/shared/IhSubheader.vue'
import BfButton from '@/components/shared/BfButton.vue'
import OrgActivity from '@/components/OrgActivity/OrgActivity.vue'
import { mapGetters,
         //mapActions
       }
from 'vuex'

export default {
  name: 'IhHome',
  components: {
    IhSubheader,
    BfButton,
    OrgActivity
  },
  computed: {
    ...mapGetters(['userToken','datasetId'])
  }
}
</script>
<style scoped lang="scss">
@import '../assets/css/_variables.scss';
.logo {
  width: auto;
  height: 5rem;
}
.logo-container {
  display: flex;
  text-align: center;
  a {
    text-decoration: none;
  }
  a:active {
    color: blue;
  }
  span:not(:last-of-type) {
    margin-right: 1rem;
  }
}
.page-content {
  padding: 0 4rem;
}
.subheader {
  padding: 1rem 4rem !important;
}
.orgtext {
  padding: 0 2rem;
  color: #2f26ad;
}
</style>

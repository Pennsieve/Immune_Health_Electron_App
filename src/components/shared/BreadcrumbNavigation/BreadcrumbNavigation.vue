<template>
  <div class="breadcrumb-navigation">
    <template v-if="!ancestors || !fileId">
      Files
    </template>
    <template v-else>
      <el-dropdown
          trigger="click"
          placement="bottom-start"
          @command="breadcrumbNavigate"
      >
        <span class="el-dropdown-link button-icon">
          <template v-if="file.parent.content.name != this.selectedStudyName">
          <svg-icon
              name="icon-menu"
              height="20"
              width="20"
          />
          </template>
        </span>
        <el-dropdown-menu
            slot="dropdown"
            class="breadcrumb-menu bf-menu"
            :arrow-offset="0"
        >
          <el-dropdown-item
              v-for="breadcrumb in breadcrumbs"
              :key="breadcrumb.content.id"
              :command="breadcrumb.content.id"
          >
            {{ breadcrumb.content.name }}
          </el-dropdown-item>
          <!--<el-dropdown-item>Files</el-dropdown-item>-->
        </el-dropdown-menu>
      </el-dropdown>

      <svg-icon
          class="breadcrumb-caret"
          name="icon-arrow-up"
          dir="right"
          height="12"
          width="12"
      />

      <span class="collection-name">
        {{ file.content.name }}
      </span>
    </template>
  </div>
</template>

<script>
import { defaultTo } from 'ramda'
import { mapGetters } from 'vuex'

export default {
  name: 'BreadcrumbNavigation',

  props: {
    fileId: {
      type: String,
      default: ''
    },
    ancestors: {
      type: Array,
      default: () => []
    },
    file: {
      type: Object,
      default: () => {}
    }
  },

  computed: {
    ...mapGetters(["selectedStudyName"]),
    /**
     * Reverse ancestors to show in correct order
     * @returns {Array}
     */
    breadcrumbs: function() {
      let x = this.ancestors
      let y = x.slice(1)
      console.log('y')
      console.log(y)
      return defaultTo([], y).reverse()
    }
  },

  methods: {
    /**
     * Handler for breadcrumb overflow navigation
     * @param {String} id
     */
    breadcrumbNavigate: function(id = '') {
      if (id) {
        return this.$emit('navigate-breadcrumb', id)
      }
      this.$emit('navigate-breadcrumb')
    },
  }
}
</script>

<style lang="scss">
@import '../../../assets/_variables.scss';

.breadcrumb-navigation {
  align-items: center;
  display: flex;
  font-size: 20px;
  font-weight: 600;
  line-height: 40px;
  margin: 0;
  white-space: nowrap;

  .breadcrumb-menu {
    max-width: 256px;
    .el-dropdown-menu__item {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .breadcrumb-caret {
    flex-shrink: 0;
    margin: 0 8px;
  }
  .collection-name {
    align-items: center;
    color: $text-color;
    outline: none;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .el-dropdown {
    display: inline-flex;
  }
}
</style>

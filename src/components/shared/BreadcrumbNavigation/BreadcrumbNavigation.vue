<template>
  <div class="breadcrumb-navigation">
    <template>
      <el-dropdown
        trigger="click"
        placement="bottom-start"
        @command="breadcrumbNavigate"
      >
        <span class="el-dropdown-link button-icon">
          <svg-icon name="icon-menu" height="17" width="17" />
        </span>
        <el-dropdown-menu
          slot="dropdown"
          class="breadcrumb-menu bf-menu"
          :arrow-offset="10"
        >
          <el-dropdown-item
            v-for="(dir, index) in remainingDirPath"
            :key="`${dir}-${index}`"
            :command="{ pathName: dir, index: index }"
          >
            {{ dir }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>

      <svg-icon
        class="breadcrumb-caret"
        name="icon-arrow-up"
        dir="right"
        height="10"
        width="10"
      />

      <span
        v-for="(dir, index) in lastThreeDirPath"
        :key="`${dir}-${index}`"
        class="collection-name"
      >
        <div v-if="index === lastThreeDirPath.length - 1">
          <div v-if="lastThreeDirPath[index].length < characterLimit">
            <strong> {{ dir }} </strong>
          </div>
          <div v-else>
            <el-tooltip
              class="item"
              effect="dark"
              :content="dir"
              placement="top"
              :visible-arrow="false"
            >
              <strong> {{ truncateBreadcrumb(dir) }} </strong>
            </el-tooltip>
          </div>
        </div>
        <div v-else>
          <div v-if="dir.length > characterLimit">
            <a href="#" @click.prevent="getDatasetDirectory(dir, index)">
              {{ truncatePreviousBreadcrumb(dir) }}</a
            >/
          </div>
          <div v-else>
            <a href="#" @click.prevent="getDatasetDirectory(dir, index)">
              {{ dir }}</a
            >/
          </div>
        </div>
      </span>
    </template>
  </div>
</template>

<script>
import { defaultTo } from 'ramda'

export default {
  name: 'BreadcrumbNavigation',

  props: {
    directoryList: {
      type: Array,
      default: () => []
    },

    directoryName: {
      type: String,
      default: ''
    }
  },

  data() {
    return {
      characterLimit: 24,
      truncatedDirectoryName: ''
    }
  },

  computed: {
    /**
     * Returns first part of directory path to populate dropdown menu
     * @returns {Array}
     */
    remainingDirPath() {
      const thirdElement = this.directoryList.length - 3
      const remainder = this.directoryList.slice(0, thirdElement)
      return defaultTo([], remainder).reverse()
    },

    /**
     * Returns last three elements in directory path to
     * display next to breadcrumb menu
     * @returns {Array}
     */
    lastThreeDirPath() {
      const thirdElement = this.directoryList.length - 3
      const last = this.directoryList.length

      return this.directoryList.slice(thirdElement, last)
    }
  },

  methods: {
    /**
     * Handler for breadcrumb overflow navigation
     * @param {Object} obj
     */
    breadcrumbNavigate(obj = {}) {
      if (obj) {
        let directoryPath = ''
        let finalObj = {}
        if (obj.index === this.remainingDirPath.length - 2) {
          // this is right before Root
          finalObj = {
            pathName: obj.pathName,
            directoryName: obj.pathName,
            index: obj.index
          }
        } else {
          // it's a long list
          // loop through index count
          for (
            let i = this.remainingDirPath.length - 2;
            i >= obj.index + 1;
            i--
          ) {
            directoryPath = directoryPath.concat(`${this.remainingDirPath[i]}/`)
          }
          directoryPath = directoryPath.concat(obj.pathName)
          finalObj = {
            pathName: directoryPath,
            directoryName: obj.pathName,
            index: obj.index
          }
        }
        return this.$emit(
          'navigate-breadcrumb',
          finalObj,
          this.remainingDirPath
        )
      }
    },

    /**
     * Truncates directory path name if longer than 24 characters
     * @param {String} directoryName
     * @returns {String}
     */
    truncateBreadcrumb(directoryName) {
      const length = directoryName.length
      // this means its 24 characters or more
      // eg length is 25, 26, 27, 28
      if (length > 24) {
        // return `${directoryName.slice(0, 24)} ... `
        const shortenedName = directoryName.slice(0, 25)
        this.truncatedDirectoryName = `${shortenedName.slice(
          0,
          12
        )} ... ${shortenedName.slice(13, shortenedName.length)}`
      }
      return this.truncatedDirectoryName
    },

    /**
     * Checks to see if the previous name in the path needs to be shortened
     * @param {String} directoryName
     * @returns {String}
     */
    truncatePreviousBreadcrumb(directoryName) {
      if (this.truncatedDirectoryName !== '') {
        const truncatedName = this.truncatedDirectoryName
        return truncatedName
      }
    },

    /**
     * Used to navigate to a specific directory when
     * clicking on a file path name
     * @param {String} dir
     * @param {Number} index
     */
    getDatasetDirectory(dir, index) {
      // got to get the previous directory before passing it
      let directoryPath = ''
      let obj = {}
      if (index === 1) {
        const tempPath = this.remainingDirPath
        tempPath.reverse()
        tempPath.push(this.lastThreeDirPath[index - 1])
        tempPath.push(dir)
        directoryPath = tempPath
        obj = { pathName: directoryPath, directoryName: dir, index }
        this.$emit('navigate-breadcrumb', obj, directoryPath)
      } else {
        // index is 0
        // tack on the previous path
        const tempPath = this.remainingDirPath
        tempPath.reverse()
        tempPath.push(this.lastThreeDirPath[index])
        directoryPath = tempPath
        obj = { pathName: directoryPath, directoryName: dir, index }
        this.$emit('navigate-breadcrumb', obj, directoryPath)
      }
    }
  }
}
</script>

<style lang="scss">
@import '../../assets/css/_variables.scss';

.breadcrumb-navigation {
  align-items: center;
  display: flex;
  font-size: 14px;
  font-weight: 400;
  line-height: 40px;
  margin: 0;
  margin-top: 3px;
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

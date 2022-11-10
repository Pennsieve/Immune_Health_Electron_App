import Vue from "vue";
import Vuex from "vuex";
import axios from 'axios'
import moment from 'moment'
import { compose, pathOr, propOr, isEmpty, defaultTo, find, propEq } from 'ramda'
import toQueryParams from '@/utils/toQueryParams.js'
import PennsieveClient from '@/utils/pennsieve/client.js'
Vue.use(Vuex);

const IMMUNE_HEALTH_DATASET_ID = 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc'
const STUDY_CONCEPT_ID = '33a61ee7-fce9-4f0c-823c-78368ed8dc42'
//WHAT IS THIS???
const DATASET_ID = 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/records/9c579bef-6ce0-4632-be1c-a95aadc982c4/30096499-ccd3-4af3-8cb2-1ef9fba359f4'
const IMMUNE_HEALTH_ORG_ID = 'N:organization:aab5058e-25a4-43f9-bdb1-18396b6920f2'

const DATASET_ACTIVITY_ALL_CATEGORIES = {
  value: null,
  label: 'All Categories',
}

export const DATASET_ACTIVITY_ALL_CONTRIBUTORS = {
  value: null,
  label: 'All Contributors',
}

const DATASET_ACTIVITY_DATE_RANGE_30 = {
  value: 30,
  label: 'Last 30 Days',
}

/**
 * Converts the days to a date range
 * @param {Object} days
 * @returns {Object}
 */
const getActivityDateRange = (days) => {
  return days
    ? {
        startDate: moment().subtract(days, 'days').format('YYYY-MM-DD'),
        endDate: moment().format('YYYY-MM-DD')
      }
    : {}
}

/**
 * Convert the dataset activity state to query
 * params for the endpoint request
 * @param {Object} params
 * @param {String} apiKey
 * @returns {String}
 */
const getQueryParams = (params, apiKey) => {
  const dateRange = getActivityDateRange(params.dateRange.value)
  console.log(dateRange)
  console.log("the api key is" , apiKey)
  console.log(params.orderDirection)
  console.log(params.category.value)
  console.log(params.userId.value)
  console.log(params.cursor)
  var one = params.category.value && { category: params.category.value}
  var two =  params.userId.value && { userId: params.userId.value}
  var three = params.cursor && { cursor: params.cursor }
  var four = dateRange
  console.log("passing this into toQueryParams ",apiKey,params.orderDirection,one, two, three, four)
  return toQueryParams({
    api_key: apiKey,
    orderDirection: params.orderDirection,
    ...params.category.value && { category: params.category.value}, // Do not add this key if null
    ...params.userId.value && { userId: params.userId.value}, // Do not add this key if null
    ...params.cursor && { cursor: params.cursor }, // Do not add this key if null
    ...dateRange
  })
}

const initialState = () => ({
  datasetSearchParams: {
    limit: 25,
    offset: 0,
    query: '',
    orderBy: 'Name',
    orderDirection: 'Asc',
    onlyMyDatasets: false,
    status: '',
    withRole: '',
    collectionId: ''
  },
  datasetTotalCount: 0,
  datasetActivityParams: {
    cursor: '',
    orderDirection: 'Asc',
    category: DATASET_ACTIVITY_ALL_CATEGORIES,
    dateRange: DATASET_ACTIVITY_DATE_RANGE_30,
    userId: DATASET_ACTIVITY_ALL_CONTRIBUTORS
  },
  isLoadingDatasetActivity: false,
  datasetActivity: []
})

//const uploadDestination = 'https://app.pennsieve.io/N:organization:aab5058e-25a4-43f9-bdb1-18396b6920f2/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/files/N:collection:fda8d13c-658f-475a-b90a-cd7a79ef7b87'
const store = new Vuex.Store({
  state: {
    profile: null,
    allStudies: [],
    selectedStudy: {},
    selectedStudyPatientsMetadata: [],
    searchModalVisible: false,
    searchModalSearch: {
      isModelInvalid: false,
      filters: [],
      model: '',
      limit: 10,
      offset: 0
    },
    scientificUnits: [],
    //hardcoded value for testing...random record to link files to'
    datasetId: DATASET_ID,
    datasetNodeId: IMMUNE_HEALTH_DATASET_ID,
    dataset: {},
    uploadDestination: 'https://app.pennsieve.io/N:organization:aab5058e-25a4-43f9-bdb1-18396b6920f2/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/records/9c579bef-6ce0-4632-be1c-a95aadc982c4/30096499-ccd3-4af3-8cb2-1ef9fba359f4',
    datasetActivity: [],
    isLoadingDatasetActivity: false,
    orgMembers: [],
    datasetActivityParams: {
      cursor: '',
      orderDirection: 'Asc',
      //If we want to use this feature, make these empty by deafult.
      category: DATASET_ACTIVITY_ALL_CATEGORIES,
      dateRange: DATASET_ACTIVITY_DATE_RANGE_30,
      userId: DATASET_ACTIVITY_ALL_CONTRIBUTORS //MIGHT NEED TO CHANGE THIS
    },
    linkingTargets: [],
    searchPage: '',
    shadedParticipants: [],
    shadedVisits: [],
    shadedSamples: [],
    shadedFiles: [],
    triggerForClearing: false,
    filterApplicationCount: 0,
    relationshipTypes: [],
    itsLinkinTime: false,
    uploadCount: 0,
    uploading: false,
    uploadRemaining: 0,
    //Returns random number between 0 and 100. Used to assign subscribe ID for a given user session
    subscribeId: 1
    //Math.floor(Math.random() * 100)
  },
  getters: {
    uploadRemaining: state => state.uploadRemaining,
    uploadCount: state => state.uploadCount,
    uploading: state => state.uploading,
    subscribeId: state => state.subscribeId,
    getRelationshipTypeByName: state => (name) => {
      return compose(
        defaultTo({}),
        find(propEq('name', name))
      )(state.relationshipTypes)
    },
    getOrgMemberByIntId: state => (id) => {
      return defaultTo({}, find(propEq('intId', id), state.orgMembers))
    },
    getOrgMembersByIntId: state => (list) => {
      return state.orgMembers.filter(member => list.includes(member.intId))
    },
    orgMembers: state => state.orgMembers,
    getOrgMembers: state => () => state.orgMembers,
    getOrgMembersById: state => (list) => {
      return state.orgMembers.filter(member => list.includes(member.id))
    },
    username (state) {
      const firstName = pathOr('', ['firstName'], state.profile)
      const lastName = pathOr('', ['lastName'], state.profile)
      const abbrvLastName = lastName.length === 1 ? lastName[0] : `${lastName[0]}.`
      return `${firstName} ${abbrvLastName}`
    },
    userToken (state) {
      return propOr('', 'token', state.profile)
    },
    profile (state) {
      return state.profile
    },
    isLoggedIn (state) {
      return state.profile !== null
    },
    allStudies (state) {
      return state.allStudies
    },
    selectedStudy (state) {
      return state.selectedStudy
    },
    subscribeId (state) {
      return state.subscribeId
    },
    selectedStudyName (state) {
      const studyValues = propOr([], 'values', state.selectedStudy)
      if (isEmpty(studyValues)) {
        return ''
      }
      return propOr('', 'value', studyValues[0])
    },
    scientificUnits (state) {
      return state.scientificUnits
    },
    searchModalVisible (state) {
      return state.searchModalVisible
    },
    uploadDestination (state) {
      return state.uploadDestination
    },
    datasetId (state) {
      return state.datasetId
    },
    shadedParticipants (state){
      return state.shadedParticipants
    },
    shadedVisits (state) {
      return state.shadedVisits
    },
    shadedSamples (state) {
      return state.shadedSamples
    },
    shadedFiles (state) {
      return state.shadedFiles
    },
    triggerForClearing (state){
      return state.triggerForClearing
    },
    linkingTargets (state) {
      return state.linkingTargets
    },
    datasetNodeId(state) {
      return state.datasetNodeId
    },
    datasetActivityParams(state) {
      return state.datasetActivityParams
    },
    filterApplicationCount(state){
      return state.filterApplicationCount
    },
    itsLinkinTime(state){
      return state.itsLinkinTime
    }
  },
  mutations: {
    UPLOAD_COUNT_ADD (state, count) {
    const totalCount = propOr(0, 'uploadCount', state) + count;
    Vue.set(state, 'uploadCount', totalCount)
  },
    UPDATE_TOTAL_UPLOAD_SIZE (state, data) {
    const updatedSize = propOr(0, 'totalUploadSize', state) + data
    Vue.set(state, 'totalUploadSize', updatedSize)
  },
    UPDATE_UPLOAD_REMAINING_ADD (state, size) {
    const totalRemaining = propOr(0, 'uploadRemaining', state) + size;
    Vue.set(state, 'uploadRemaining', totalRemaining)
  },
    SET_ITS_LINKIN_TIME(state,data){
      state.itsLinkinTime - data
    },
    UPDATE_FILTER_APPLICATION_COUNT(state, data){
      state.filterApplicationCount = data
    },
    UPDATE_PROFILE(state, data) {
      state.profile = data
    },
    UPDATE_UPLOAD_STATUS (state, uploading) {
      state.uploading = uploading
    },
    UPDATE_SUBSCRIBE_ID(state, subscribeId){
      state.subscribeId = subscribeId
    },
    SET_ALL_STUDIES(state, data) {
      state.allStudies = data
    },
    SET_SELECTED_STUDY(state, data) {
      state.selectedStudy = data
    },
    UPDATE_SEARCH_MODAL_VISIBLE (state, data) {
      state.searchModalVisible = data
    },
    UPDATE_SEARCH_MODAL_SEARCH (state, data) {
      state.searchModalSearch = data
    },
    SET_SCIENTIFIC_UNITS (state, data) {
      state.scientificUnits = data
    },
    UPDATE_DATASET_ACTIVITY_CURSOR(state, cursor) {
      state.datasetActivityParams.cursor = cursor
    },
    UPDATE_DATASET_ACTIVITY_CATEGORY(state, category) {
      state.datasetActivityParams.category = { ...category }
    },
    UPDATE_DATASET_ACTIVITY_USER_ID(state, userId) {
      state.datasetActivityParams.userId = { ...userId }
    },
    UPDATE_DATASET_ACTIVITY_DATE_RANGE(state, dateRange) {
    state.datasetActivityParams.dateRange = { ...dateRange }
    },
    UPDATE_DATASET_ACTIVITY_ORDER_DIRECTION(state, orderDirection) {
      state.datasetActivityParams.orderDirection = orderDirection
    },
    CLEAR_DATASET_ACTIVITY_STATE(state) {
      const _initialState = initialState()

      const clearedState = {
      isLoadingDatasetActivity: _initialState.isLoadingDatasetActivity,
      //isLoadingDatasetActivity: false,
      datasetActivity: _initialState.datasetActivity,
      //datasetActivity: [],
      datasetActivityParams: _initialState.datasetActivityParams
      /*
      datasetActivityParams: {
        cursor: '',
        orderDirection: 'Asc',
        //If we want to use this feature, make these empty by deafult.
        category: DATASET_ACTIVITY_ALL_CATEGORIES,
        dateRange: DATASET_ACTIVITY_DATE_RANGE_30,
        userId: DATASET_ACTIVITY_ALL_CONTRIBUTORS //MIGHT NEED TO CHANGE THIS
      }
      */
      }

      Object.keys(clearedState).forEach(key => state[key] = clearedState[key])
    },
    UPDATE_IS_LOADING_DATASET_ACTIVITY(state, isLoading) {
      state.isLoadingDatasetActivity = isLoading
    },
    UPDATE_DATASET_ACTIVITY(state, activity) {
      state.datasetActivity = activity
    },
    UPDATE_ORG_MEMBERS(state, members){
      state.orgMembers = members
    },
    SET_DATASET (state, dataset) {
        state.dataset = dataset
        //const profileId = pathOr('', ['profile', 'id'], state)
        //const datasetId = prop('owner', dataset)
        //const isDatasetOwner = profileId === datasetId
        //state.isDatasetOwner = isDatasetOwner
      },
    SET_SEARCH_PAGE (state, data) {
      state.searchPage = data
    },
    SET_LINKING_TARGETS (state, data) {
      state.linkingTargets = data
    },
    CLEAR_CLICKED_SELECTIONS (state){
      state.shadedParticipants = []
      state.shadedVisits = []
      state.shadedSamples = []
      state.shadedFiles = []
    },
    SET_SHADED_PARTICIAPNTS(state, data){
      state.shadedParticipants = data
    },
    SET_SHADED_VISITS(state, data){
      state.shadedVisits = data
    },
    SET_SHADED_SAMPLES(state, data){
      state.shadedSamples = data
    },
    SET_SHADED_FILES(state, data){
      state.shadedFiles = data
    },
    SET_TRIGGER_FOR_CLEARING(state,data){
      state.triggerForClearing = data
    },
    ADD_RELATIONSHIP_TYPE (state, data) {
      state.relationshipTypes.push(data)
    },
  },
  actions: {
    addRelationshipType: ({commit}, evt) => commit('ADD_RELATIONSHIP_TYPE', evt),
    setItsLinkinTime({commit}, data){
      commit('SET_ITS_LINKIN_TIME')
    },
    updateFilterApplicationCount({commit}, data){
      commit('UPDATE_FILTER_APPLICATION_COUNT', data)
    },
    clearClickedSelections({commit}){
      commit('CLEAR_CLICKED_SELECTIONS')
    },
    setShadedParticipants({commit}, data){
      commit('SET_SHADED_PARTICIAPNTS',data)
    },
    setShadedVisits({commit}, data){
      commit('SET_SHADED_VISITS',data)
    },
    setShadedSamples({commit}, data){
      commit('SET_SHADED_SAMPLES',data)
    },
    setShadedFiles({commit}, data) {
      commit('SET_SHADED_FILES',data)
    },
    setTriggerForClearing({commit}, data){
      commit('SET_TRIGGER_FOR_CLEARING',data)
    },
    setDataset: ({commit}, evt) => commit('SET_DATASET', evt),
    updateOrgMembers: ({ commit }, evt) => commit('UPDATE_ORG_MEMBERS', evt),
    clearDatasetActivityState: ({commit}) => {
      commit('CLEAR_DATASET_ACTIVITY_STATE')
    },
    updateDatasetActivityOrderDirection: ({commit, dispatch}, orderDirection) => {
      commit('UPDATE_DATASET_ACTIVITY_CURSOR', '')
      commit('UPDATE_DATASET_ACTIVITY_ORDER_DIRECTION', orderDirection)
      dispatch('fetchDatasetActivity')
    },
    updateDatasetActivityDateRange: ({ commit, dispatch }, dateRange) => {
      commit('UPDATE_DATASET_ACTIVITY_CURSOR', '')
      commit('UPDATE_DATASET_ACTIVITY_DATE_RANGE', dateRange)
      dispatch('fetchDatasetActivity')
    },
    updateDatasetActivityUserId: ({ commit, dispatch }, userId) => {
      commit('UPDATE_DATASET_ACTIVITY_CURSOR', '')
      commit('UPDATE_DATASET_ACTIVITY_USER_ID', userId)
      dispatch('fetchDatasetActivity')
    },
    fetchDatasetActivity: async ({state, commit}) => {
      commit('UPDATE_IS_LOADING_DATASET_ACTIVITY', true)
      console.log("attempting to fetch organization activity")
      const datasetId = state.datasetId
      //const endpoint = `${rootState.config.apiUrl}/datasets/${datasetId}/changelog/timeline`
      const endpoint = `https://api.pennsieve.io/datasets/${IMMUNE_HEALTH_DATASET_ID}/changelog/timeline`
      const apiKey =  propOr('', 'token', state.profile)
      console.log(apiKey)
      //const apiKey = this.userToken
      //import below from datasetModule.js in utils and uncomment
      console.log(state.datasetActivityParams)
      const queryParams = getQueryParams(state.datasetActivityParams, apiKey)

      const url = `${endpoint}?${queryParams}`

      try {
        const resp = await fetch(url)
        if (resp.ok) {
          const { eventGroups, cursor } = await resp.json()
          const datasetActivity = state.datasetActivityParams.cursor ? [ ...state.datasetActivity, ...eventGroups ] : eventGroups
          console.log("we've got dataset activity")
          commit('UPDATE_DATASET_ACTIVITY', datasetActivity)

          commit('UPDATE_DATASET_ACTIVITY_CURSOR', cursor)
        } else {
          commit('UPDATE_DATASET_ACTIVITY', [])
          throw new Error(resp.statusText)
        }
        commit('UPDATE_IS_LOADING_DATASET_ACTIVITY', false)
      } catch (err) {
        //EventBus.$emit('ajaxError', err)
        commit('UPDATE_IS_LOADING_DATASET_ACTIVITY', false)
        commit('UPDATE_DATASET_ACTIVITY', [])
      }
    },
    updateDatasetActivityCategory: ({ commit, dispatch }, category) => {
      commit('UPDATE_DATASET_ACTIVITY_CURSOR', '')
      commit('UPDATE_DATASET_ACTIVITY_CATEGORY', category)
      dispatch('fetchDatasetActivity')
    },
    //add one for setting record linking (upload) destination
    uploadCountAdd: ({ commit }, evt) => commit('UPLOAD_COUNT_ADD', evt),
    updateTotalUploadSize: ({commit}, evt) => commit('UPDATE_TOTAL_UPLOAD_SIZE', evt),
    updateUploadStatus: ({ commit }, evt) => commit('UPDATE_UPLOAD_STATUS', evt),
    updateUploadRemainingAdd: ({ commit }, evt) => commit('UPDATE_UPLOAD_REMAINING_ADD', evt),
    async login({ commit, dispatch, state }) {
      let ps = new PennsieveClient()
      ps.login()
        .then(async function(user) {
          await dispatch('updateProfile', user)
          await dispatch('fetchStudies')
          await dispatch('setSelectedStudy', state.allStudies[0])
          await dispatch('setScientificUnits')
          await dispatch("fetchOrgMembers")
        })
        .catch(err => {
          // TODO: what to do in case of an error? (perhaps add toast messages?)
          console.log('login() failed, err:')
          console.log(err)
        })
    },
    async updateProfile({commit, dispatch}, user) {
      await commit('UPDATE_PROFILE',{
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ')[1],
        token: user.session_token,
        tokenExpirationTime: +user.token_expire
      })
      // check for token expiration every minute
      let reAuthTimer = setTimeout(function reAuth() {
        dispatch('reAuthenticate')
        reAuthTimer = setTimeout(reAuth, 60000);
      }, 60000);
    },
    reAuthenticate({state, dispatch}) {
      let expirationTime = +state.profile.tokenExpirationTime
      let currentTime = Math.floor(Date.now()/1000)
      let expiresIn = expirationTime - currentTime
      // re-authenticate if token expires in less than 5 minutes
      if (expiresIn  <= 300) {
        dispatch('login')
      }
    },
    async setSelectedStudy({ commit }, data) {
      await commit('SET_SELECTED_STUDY', data)
    },
    async fetchStudies({ commit }) {
      const apiKey = this.state.profile.token
      const studiesUrl = `https://api.pennsieve.io/models/datasets/${IMMUNE_HEALTH_DATASET_ID}/concepts/${STUDY_CONCEPT_ID}/instances?api_key=${apiKey}`

      let responseData = []
      await axios.get(studiesUrl).then(response => {
        responseData = response.data
      })
      await commit('SET_ALL_STUDIES',responseData)
    },
    updateSearchModalVisible({ commit }, data) {
      commit('UPDATE_SEARCH_MODAL_VISIBLE', data)
    },
    updateSearchModalSearch: ({ commit }, data) => {
      commit('UPDATE_SEARCH_MODAL_SEARCH', data)
    },
    setDatasetRole({commit}, data) {
      commit('SET_DATASET_ROLE', data)
    },
    setSearchPage({ commit }, data) {
      commit('SET_SEARCH_PAGE', data)
    },
    setLinkingTargets({ commit }, data) {
      commit('SET_LINKING_TARGETS', data)
    },
    updateSubscribeId({ commit }, data){
      commit('UPDATE_SUBSCRIBE_ID', data)
    },
    async setScientificUnits ({ commit }) {
      const apiKey = this.state.profile.token
      const scientificUnitsUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/properties/units?api_key=${apiKey}`
      let responseData = []
      await axios.get(scientificUnitsUrl).then(({data}) => {
        data.push({
          dimension: 'Other',
          units: [{
            name: 'Other',
            displayName: 'Other',
            description: 'Other'
          }]
        })
        responseData = data
      })
      await commit('SET_SCIENTIFIC_UNITS', responseData)
    },
    /**
     * Retrieves all members of an organization
     */
    async fetchOrgMembers ({ commit }) {
      const apiKey = this.state.profile.token
      const url = `https://api.pennsieve.io/organizations/${IMMUNE_HEALTH_ORG_ID}/members?api_key=${apiKey}`
      if (!url) {
        return
      }
      await axios.get(url).then(({data}) => {
        // const members = this.updateMembers(resp)
        console.log(data)
        commit('UPDATE_ORG_MEMBERS', data)
      })
    },
  },

});

export default store;

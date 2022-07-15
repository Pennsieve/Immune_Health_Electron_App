import Vue from "vue";
import Vuex from "vuex";
import axios from 'axios'
import moment from 'moment'
import { pathOr, propOr, isEmpty } from 'ramda'
import toQueryParams from '@/utils/toQueryParams.js'
Vue.use(Vuex);

// HARDCODED FOR NOW: UPDATE apiKey VALUE WITH A VALID LOGGED IN USER API TOKEN TO GET STUDIES POPULATED
const API_KEY = 'eyJraWQiOiJwcjhTaWE2dm9FZTcxNyttOWRiYXRlc3lJZkx6K3lIdDE4RGR5aGVodHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI4NDQ3NWU5NS1kNGYyLTQxNDItOTJlYS03OWQzN2NiODliMTQiLCJkZXZpY2Vfa2V5IjoidXMtZWFzdC0xXzJlMzc5MmUzLWRmZWEtNDA2OC1hY2RiLWJiN2I2YjdjNzYwZSIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0xX2IxTnl4WWNyMCIsImNsaWVudF9pZCI6IjY3MG1vN3NpODFwY2Mzc2Z1YjdvMTkxNGQ4Iiwib3JpZ2luX2p0aSI6ImZjYWE1Y2JkLTZlNDYtNDFjMS05NzgyLWZlOTQ4MzZjMWUwMSIsImV2ZW50X2lkIjoiZjEzMTUwOTgtYzMwMC00ZjUxLTgyMDUtY2IwOGJlYjQ1NzdiIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTY1Nzg5NDc5MywiZXhwIjoxNjU3ODk4MzkzLCJpYXQiOjE2NTc4OTQ3OTMsImp0aSI6IjRmZjA2Zjk5LTE1MmEtNGVhNy04YTFjLTcxNmNiMjQ0YjAzOCIsInVzZXJuYW1lIjoiODQ0NzVlOTUtZDRmMi00MTQyLTkyZWEtNzlkMzdjYjg5YjE0In0.A-ddtqbpDOOizcOSvlMjwN897Co6kuLYjxvd03yKzAP5ZNjknBUXKUWbKrCT-jtaMXYiKb84ncwJXzBuOeovM1sSLMYRtUknGl7DXQCSuBetcMAX8EimwNSfR1BkQ2rEgYpPQR4aiuuXHI0Q8Ep4PFeXHrpkixqrGDRsP9qEmliFI8ff0vQMQ8llD9rOQOiFrQXzMjSQnRMQv14dHjicZlmnPGuvLHBq_TBiGY7RuuOl49s_f81FkVzhhw_Jjix61uSn519lZz75S-pXwbPRiCO1v9PrBOJTTUDqZu0NhYUlAH1XEnYepRDDUFN1TrT4yjUtsTkYuYWVkGmvjgQBmA'

const DATASET_ID = 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/records/9c579bef-6ce0-4632-be1c-a95aadc982c4/30096499-ccd3-4af3-8cb2-1ef9fba359f4'

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
    searchModalSearch: {},
    scientificUnits: [],
    //hardcoded value for testing...random record to link files to'
    datasetId: DATASET_ID,
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
    }
  },
  getters: {
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
    isLoggedIn (state) {
      return state.profile !== null
    },
    allStudies (state) {
      return state.allStudies
    },
    selectedStudy (state) {
      return state.selectedStudy
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
    }
  },
  mutations: {
    /*
    UPLOAD_COUNT_ADD (state, count) {
      //find another way
      //const totalCount = propOr(0, 'uploadCount', state) + count;
      state.uploadCount = totalCount
    },
    */
    /*
    UPDATE_TOTAL_UPLOAD_SIZE (state, data) {
      //cant get below from prop
      //const updatedSize = propOr(0, 'totalUploadSize', state) + data
      state.totalUploadSize = updatedSize
    },
    */
    /*
    UPDATE_UPLOAD_REMAINING_ADD (state, size) {
      //change this
      //const totalRemaining = propOr(0, 'uploadRemaining', state) + size;
      state.uploadRemaining = totalRemaining
    },
    */
    UPDATE_UPLOAD_STATUS (state, uploading) {
      state.uploading = uploading
    },
    SET_ALL_STUDIES(state, data) {
      state.allStudies = data
    },
    SET_SELECTED_STUDY(state, data) {
      state.selectedStudy = data
    },
    SET_SELECTED_STUDY_PATIENTS_METADATA(state, data) {
      state.selectedStudyPatientsMetadata = data
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
  },
  actions: {
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

    const datasetId = datasetId
    //const endpoint = `${rootState.config.apiUrl}/datasets/${datasetId}/changelog/timeline`
    const endpoint = `https://api.pennsieve.io/datasets/${datasetId}/changelog/timeline`
    const apiKey = this.userToken
    //import below from datasetModule.js in utils and uncomment
    const queryParams = getQueryParams(state.datasetActivityParams, apiKey)

    const url = `${endpoint}?${queryParams}`

    try {
      const resp = await fetch(url)
      if (resp.ok) {
        const { eventGroups, cursor } = await resp.json()
        const datasetActivity = state.datasetActivityParams.cursor ? [ ...state.datasetActivity, ...eventGroups ] : eventGroups
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
    async login({ dispatch, state }) {
      // Set a dummy profile for now
      this.state.profile = {
        firstName: 'Test',
        lastName: 'Profile',
        token: API_KEY
      }
      await dispatch('fetchStudies')
      await dispatch('setSelectedStudy', state.allStudies[0])
      await dispatch('setScientificUnits')
    },
    async setSelectedStudy({ commit }, data) {
      await commit('SET_SELECTED_STUDY', data)
    },
    async fetchStudies({ commit }) {
      const studiesUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances?api_key=${API_KEY}`

      let responseData = []
      await axios.get(studiesUrl).then(response => {
        responseData = response.data
      })
      await commit('SET_ALL_STUDIES',responseData)
    },
    async fetchSelectedStudyPatientsMetadata({ commit, state }) {
      const selectedStudyId = propOr('', 'id', state.selectedStudy)
      const patientsStudyMetadataUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances/${selectedStudyId}/relations/patient?includeIncomingLinkedProperties=true`
      const header = {
        headers: { Authorization: `Bearer ${API_KEY}`}
      }
      let responseData = []
      await axios.get(patientsStudyMetadataUrl, header).then(response => {
        responseData = response.data
      })
      await commit('SET_SELECTED_STUDY_PATIENTS_METADATA', responseData)
    },
    updateSearchModalVisible({ commit }, data) {
      commit('UPDATE_SEARCH_MODAL_VISIBLE', data)
    },
    updateSearchModalSearch: ({ commit }, data) => {
      commit('UPDATE_SEARCH_MODAL_SEARCH', data)
    },
    async setScientificUnits ({ commit }) {
      const scientificUnitsUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/properties/units?api_key=${API_KEY}`
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
    }
  },
});

export default store;

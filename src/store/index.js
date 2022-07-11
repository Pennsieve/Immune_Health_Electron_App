import Vue from "vue";
import Vuex from "vuex";
import axios from 'axios'
import { pathOr, propOr, isEmpty } from 'ramda'

Vue.use(Vuex);

// HARDCODED FOR NOW: UPDATE apiKey VALUE WITH A VALID LOGGED IN USER API TOKEN TO GET STUDIES POPULATED
const API_KEY = 'eyJraWQiOiJwcjhTaWE2dm9FZTcxNyttOWRiYXRlc3lJZkx6K3lIdDE4RGR5aGVodHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI5NzY0NGZkYy1iZjFmLTRkMzUtOWRlMC1hYzlkODUxZmEyZTEiLCJkZXZpY2Vfa2V5IjoidXMtZWFzdC0xXzZkNDc4M2U3LThhNTctNGY0Yy1iODQ5LWYzZGExMGUzMmRlNSIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0xX2IxTnl4WWNyMCIsImNsaWVudF9pZCI6IjY3MG1vN3NpODFwY2Mzc2Z1YjdvMTkxNGQ4Iiwib3JpZ2luX2p0aSI6IjNiN2IyNDA1LTZhMjUtNDBmZC1iN2NmLTZlZTkzODVmMjdhYiIsImV2ZW50X2lkIjoiNjBkMTU4ZTktYjA1Ny00Y2YzLTk4MzEtZjUxMGNhYTRjZDMxIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTY1NzU1Mjg3OSwiZXhwIjoxNjU3NTU3MDg2LCJpYXQiOjE2NTc1NTM0ODYsImp0aSI6ImIxNGNmMGNlLTY0MjQtNGZhMS1hYTc4LTNkYTRjMzY4ZGFjZSIsInVzZXJuYW1lIjoiOTc2NDRmZGMtYmYxZi00ZDM1LTlkZTAtYWM5ZDg1MWZhMmUxIn0.kKsw3i5HOkRjgKiN1PK9HoG06dmp_DP2agMQI5pZKoA0KGk7wwhtLV_BT5IAMhcsmg0mMEGjTqhD7WDVer7BSoB0aqzO07aDK8iXECteY3PVOPCOGkst19NQT5_yb4RwswcBzgJp_GjVU1S8ZV9pG63CP5y183on5EZF8x5kWpUejdn1mByPxuV9mpFHrqQ_rbwntuIKnD1JNwSydKUdhm3v2_uRUDrTrGa0sAQFBQ3fCmsSQ_-Ok4wBr_7MJUgVdZDmQsqLEFYDN71-xeDUND3h01sS2mHmoAy1VwUwh6lqIix7JFJFf8D1BBY5jWNgTImNDfXKkW6unryK201yig'

const getStudyName = function(study) {
  const studyValues = propOr([], 'values', study)
  if (isEmpty(studyValues)) {
    return ''
  }
  return propOr('', 'value', studyValues[0])
}

const store = new Vuex.Store({
  state: {
    profile: null,
    allStudies: [],
    selectedStudy: {},
    searchModalVisible: false,
    searchModalSearch: {
      isModelInvalid: false, 
      filters: [],
      model: ''
    },
    scientificUnits: [],
    datasetRole: 'viewer',
    //The following 3 are all the records for the models of interest that are related to a selected study (selected study sets them initially)
    allPatientsMetadata: [],
    allVisitsMetadata: [],
    allSamplesMetadata: [],
    // The following 3 are filtered subsets of the 3 properties above after applying the searchModalSearch filters to them
    filteredPatientsMetadata: [],
    filteredSamplesMetadata: [],
    filteredVisitsMetadata: [],
    //TODO: variable to be updated whenever a single visit or sample is selected on either the data viz page or the uploads page. Will just have one upload target for now
    //TODO: This can be set by: selectedCurrVisit and selectedCurrSample (under the condition that only one of the two is selected and the list has a length of 1),
    uploadTarget: {},
    searchPage: ''
  },
  getters: {
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
      return getStudyName(state.selectedStudy)
    },
    scientificUnits (state) {
      return state.scientificUnits
    },
    searchModalVisible (state) {
      return state.searchModalVisible
    },
    getPermission: state => (role = 'manager') => {
      const roles = {
        owner: 3,
        manager: 2,
        editor: 1,
        viewer: 0
      }
      return roles[state.datasetRole] >= roles[role]
    },
    getDatasetRole (state) {
      return state.datasetRole
    },
  },
  mutations: {
    SET_ALL_STUDIES(state, data) {
      state.allStudies = data
    },
    SET_SELECTED_STUDY(state, data) {
      state.selectedStudy = data
    },
    SET_ALL_PATIENTS_METADATA(state, data) {
      state.allPatientsMetadata = data
    },
    SET_ALL_VISITS_METADATA(state, data) {
      state.allVisitsMetadata = data
    },
    SET_ALL_SAMPLES_METADATA(state, data) {
      state.allSamplesMetadata = data
    },
    SET_FILTERED_PATIENTS_METADATA(state, data) {
      state.filteredPatientsMetadata = data
    },
    SET_FILTERED_VISITS_METADATA(state, data) {
      state.filteredVisitsMetadata = data
    },
    SET_FILTERED_SAMPLES_METADATA(state, data) {
      state.filteredSamplesMetadata = data
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
    SET_DATASET_ROLE (state, data) {
      const role = propOr('viewer', 'role', data)
      state.datasetRole = role
    },
    SET_SEARCH_PAGE (state, data) {
      state.searchPage = data
    }
  },
  actions: {
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
    setSelectedStudy({ commit }, data) {
      commit('SET_SELECTED_STUDY', data)
    },
    async fetchStudies({ commit }) {
      const studiesUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances?api_key=${API_KEY}`

      await axios.get(studiesUrl).then(response => {
        commit('SET_ALL_STUDIES', response.data)
      })
    },
    // fetches all the patients metadata for the selected study
    async fetchAllPatientsMetadata({ commit, state }) {
      const selectedStudyId = propOr('', 'id', state.selectedStudy)
      const patientsStudyMetadataUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances/${selectedStudyId}/relations/patient?includeIncomingLinkedProperties=true`
      const header = {
        headers: { Authorization: `Bearer ${API_KEY}`}
      }
      await axios.get(patientsStudyMetadataUrl, header).then(response => {
        commit('SET_ALL_PATIENTS_METADATA', response.data)
      })
    },
    // fetches all the visits metadata for the selected study
    async fetchAllVisitsMetadata({ commit, state }) {
      const selectedStudyId = propOr('', 'id', state.selectedStudy)
      const visitsStudyMetadataUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances/${selectedStudyId}/relations/visits?includeIncomingLinkedProperties=true`
      const header = {
        headers: { Authorization: `Bearer ${API_KEY}`}
      }
      await axios.get(visitsStudyMetadataUrl, header).then(response => {
        commit('SET_ALL_VISITS_METADATA', response.data)
      })
    },
    // fetches all the samples metadata for the selected study
    async fetchAllSamplesMetadata({ commit, state }) {
      const selectedStudyId = propOr('', 'id', state.selectedStudy)
      const samplesStudyMetadataUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances/${selectedStudyId}/relations/samples?includeIncomingLinkedProperties=true`
      const header = {
        headers: { Authorization: `Bearer ${API_KEY}`}
      }
      await axios.get(samplesStudyMetadataUrl, header).then(response => {
        commit('SET_ALL_SAMPLES_METADATA', response.data)
      }) 
    },
    async applyFiltersToMetadata({ commit, state }) {
      let filteredPatients = state.allPatientsMetadata
      let filteredSamples = state.allSamplesMetadata
      let filteredVisits = state.allVisitsMetadata

      commit('SET_FILTERED_PATIENTS_METADATA', filteredPatients)
      commit('SET_FILTERED_SAMPLES_METADATA', filteredSamples)
      commit('SET_FILTERED_VISITS_METADATA', filteredVisits)
    },
    updateSearchModalVisible({ commit }, data) {
      commit('UPDATE_SEARCH_MODAL_VISIBLE', data)
    },
    updateSearchModalSearch({ commit }, data) {
      commit('UPDATE_SEARCH_MODAL_SEARCH', data)
    },
    setDatasetRole({commit}, data) {
      commit('SET_DATASET_ROLE', data)
    },
    setSearchPage({ commit }, data) {
      commit('SET_SEARCH_PAGE', data)
    },
    async setScientificUnits ({ commit }) {
      const scientificUnitsUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/properties/units?api_key=${API_KEY}`
      await axios.get(scientificUnitsUrl).then(({data}) => {
        data.push({
          dimension: 'Other',
          units: [{
            name: 'Other',
            displayName: 'Other',
            description: 'Other'
          }]
        })
        commit('SET_SCIENTIFIC_UNITS', data)
      })
    }
  },
});

export default store;
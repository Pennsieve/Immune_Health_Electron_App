import Vue from "vue";
import Vuex from "vuex";
import axios from 'axios'
import { pathOr, propOr, isEmpty } from 'ramda'

Vue.use(Vuex);

// HARDCODED FOR NOW: UPDATE apiKey VALUE WITH A VALID LOGGED IN USER API TOKEN TO GET STUDIES POPULATED
const API_KEY = 'eyJraWQiOiJwcjhTaWE2dm9FZTcxNyttOWRiYXRlc3lJZkx6K3lIdDE4RGR5aGVodHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI5NzY0NGZkYy1iZjFmLTRkMzUtOWRlMC1hYzlkODUxZmEyZTEiLCJkZXZpY2Vfa2V5IjoidXMtZWFzdC0xXzZkNDc4M2U3LThhNTctNGY0Yy1iODQ5LWYzZGExMGUzMmRlNSIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0xX2IxTnl4WWNyMCIsImNsaWVudF9pZCI6IjY3MG1vN3NpODFwY2Mzc2Z1YjdvMTkxNGQ4Iiwib3JpZ2luX2p0aSI6IjIwNTI0MjJjLTUzZDQtNGUyYS05YTA1LTVjNzUxMjQ5ZDEzZSIsImV2ZW50X2lkIjoiZjVjNzRkNWMtMjMwYS00ZDJjLTlhMTMtZDRlY2YwMzVjNzFhIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTY1NjQyMDkyOSwiZXhwIjoxNjU2NDM2Nzk0LCJpYXQiOjE2NTY0MzMxOTQsImp0aSI6IjkxNzA3YmIwLTk4YzgtNGU5MS05ODdjLWY2NDlkN2UxNzQyNyIsInVzZXJuYW1lIjoiOTc2NDRmZGMtYmYxZi00ZDM1LTlkZTAtYWM5ZDg1MWZhMmUxIn0.MayvRyMjsuV-YW82-WkabvBPYPFiD1j1Y172byyIyzq6yChn0frle6R8xI0MCtjQjw5cm_G2CDBWOXr8kogunwje6Jf_DOgxZClscvpvd3V0Y9uCwtCSIuM9zQYQgyxsjuEYYW58FwD9at9M4dOEOUKwDQlcqFFv2Pva19VirTOFY7OlTrkY47vc271RUopPWd5H81prdyMwfYh_2y0W2VKqG_3Qk4v4sBfXDdlbch3a30uYJ2EFKLcZnbqzW0KpHhmCi95BKLWfKqFk6HEQwVhVOYt-CQ3C_Jw8P8kMT-6zMW2XCEjbKeAeS0P7ZHPqbVNHph2RRiM16WC0HjNmpA'

const store = new Vuex.Store({
  state: {
    profile: null,
    allStudies: [],
    selectedStudy: {},
    selectedStudyPatientsMetadata: [],
    searchModalVisible: false,
    searchModalSearch: {},
    scientificUnits: [],
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
    }
  },
  mutations: {
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

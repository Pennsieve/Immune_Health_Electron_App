import Vue from "vue";
import Vuex from "vuex";
import axios from 'axios'
import { pathOr, propOr, isEmpty } from 'ramda'

Vue.use(Vuex);

const IMMUNE_HEALTH_DATASET_ID = 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc'
const STUDY_CONCEPT_ID = '33a61ee7-fce9-4f0c-823c-78368ed8dc42'
// HARDCODED FOR NOW: UPDATE apiKey VALUE WITH A VALID LOGGED IN USER API TOKEN TO GET STUDIES POPULATED
const API_KEY = 'eyJraWQiOiJwcjhTaWE2dm9FZTcxNyttOWRiYXRlc3lJZkx6K3lIdDE4RGR5aGVodHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI5NzY0NGZkYy1iZjFmLTRkMzUtOWRlMC1hYzlkODUxZmEyZTEiLCJkZXZpY2Vfa2V5IjoidXMtZWFzdC0xXzZkNDc4M2U3LThhNTctNGY0Yy1iODQ5LWYzZGExMGUzMmRlNSIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0xX2IxTnl4WWNyMCIsImNsaWVudF9pZCI6IjY3MG1vN3NpODFwY2Mzc2Z1YjdvMTkxNGQ4Iiwib3JpZ2luX2p0aSI6IjU2YjI5NGZlLWIxODItNDA4ZS1hMmMyLWQzOTI5NDMwOWU1YSIsImV2ZW50X2lkIjoiYmMwMTRiOGQtOTgxZS00NGQ2LTliZmMtZWFiMjAyMzVmZTYzIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTY1ODQxNjIzMiwiZXhwIjoxNjU4NDQ0OTMyLCJpYXQiOjE2NTg0NDEzMzIsImp0aSI6IjQ5NDIyODk2LWMwYTYtNDc4Mi04YWNjLTI2MDc4ZjA2NDNmMSIsInVzZXJuYW1lIjoiOTc2NDRmZGMtYmYxZi00ZDM1LTlkZTAtYWM5ZDg1MWZhMmUxIn0.KiUeW-8Oj6ksU792eJJDhMac9hkp7JsTD1nncQGw5sWqn5dXh5zD0-8i6bGBBoRvRFNDOfWWJqCinsxDr2I5l37BgWZBt5qAbTXXd3oXNU_b7fHD3w4MoTNAb1e9hRJqa39Zur6Mua6oJc_3xpYblqFyiML7Tp5sckNvl_Ubq7dudp1kISk14Sa8OTOdVjqx6B8HzW4dDrz6gL9kYXhLaWUeQ9m_iYh6886Kso-srAbIlwroRS4nCvJe7W3HsPaKtJYhpy24ajb82Vb8fZe2Ah_dQ69ue6xRUFPr2N_jfcZeZn7IqREJaaptYaJxYC2YREaFHLz1i6biLOWzjhCBxg'

const store = new Vuex.Store({
  state: {
    profile: null,
    allStudies: [],
    selectedStudy: {},
    searchModalVisible: false,
    searchModalSearch: {
      isModelInvalid: false, 
      filters: [],
      model: '',
      limit: 25,
      offset: 0
    },
    scientificUnits: [],
    datasetRole: 'viewer',
    // The target that the uploaded files will be linked to
    linkingTarget: {},
    searchPage: '',
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
    },
    SET_LINKING_TARGET (state, data) {
      state.linkingTarget = data
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
    setSelectedStudy({ commit }, data) {
      commit('SET_SELECTED_STUDY', data)
    },
    async fetchStudies({ commit }) {
      const studiesUrl = `https://api.pennsieve.io/models/datasets/${IMMUNE_HEALTH_DATASET_ID}/concepts/${STUDY_CONCEPT_ID}/instances?api_key=${API_KEY}`

      await axios.get(studiesUrl).then(response => {
        commit('SET_ALL_STUDIES', response.data)
      })
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
    setLinkingTarget({ commit }, data) {
      commit('SET_LINKING_TARGET', data)
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
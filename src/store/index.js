import Vue from "vue";
import Vuex from "vuex";
import axios from 'axios'
import { pathOr, propOr, isEmpty } from 'ramda'

Vue.use(Vuex);

const IMMUNE_HEALTH_DATASET_ID = 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc'
const STUDY_CONCEPT_ID = '33a61ee7-fce9-4f0c-823c-78368ed8dc42'
// HARDCODED FOR NOW: UPDATE apiKey VALUE WITH A VALID LOGGED IN USER API TOKEN TO GET STUDIES POPULATED
const API_KEY = 'eyJraWQiOiJwcjhTaWE2dm9FZTcxNyttOWRiYXRlc3lJZkx6K3lIdDE4RGR5aGVodHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI2YzViZGUwMS1mM2U1LTRhYzQtYmZkYi1mODgzYjkyZTQ1YzYiLCJkZXZpY2Vfa2V5IjoidXMtZWFzdC0xXzJlMzJjZWI0LTNjMzAtNGEyNi05ZWUyLWFhNmRiMTdlNDlkNCIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0xX2IxTnl4WWNyMCIsImNsaWVudF9pZCI6IjY3MG1vN3NpODFwY2Mzc2Z1YjdvMTkxNGQ4Iiwib3JpZ2luX2p0aSI6ImIwZWNlNDc3LTg1MWYtNDg4Yy1iN2I0LWY3OWVhNDViZTVkMiIsImV2ZW50X2lkIjoiYjBkZDg1ZDQtNGU3ZS00YWU1LTkwYmEtNmFmOWY1NWZhZmM3IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTY1OTQ1NjE4NywiZXhwIjoxNjU5NDU5Nzg3LCJpYXQiOjE2NTk0NTYxODcsImp0aSI6ImZkNTc3NWExLWUzNmUtNGM2My04NzAyLTM0MTY4ZGEzN2U0MiIsInVzZXJuYW1lIjoiNmM1YmRlMDEtZjNlNS00YWM0LWJmZGItZjg4M2I5MmU0NWM2In0.Gjg8qd0eu55W3Lylx-VPpAY57-KrumIZtNfnghl3-b1glkBM5w53-8VpOF2LXHYN-oldLso83cz8x6mEz_w72NdRwBFerJeqNNTbC8zAX16Rh-hWEtKYIwHRICBGdvlNdA9iLYTKhVczPOptGErH9MR74gorU8F5bouTEan9ngHkMnQr3llmQW2ff0Xdx5KLYXGRP9MdNRdRO4H0LFsS9knHsFzb6PyV57amfxUmkkuaxacl-8P_mijA980A9G9_l0loY3lVljWh9ZDov8A12Jz7fxAbFiuyexEaz8rcOEoassL5xgB3b4-UiGcLPF720C6xAfo0EU2TA4QmR-wlEg'

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
shadedParticipants: [],
    shadedVisits: [],
    shadedSamples: [],
    shadedFiles: []
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
    }
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
      }
  },
  actions: {
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
    setShadedFiles({commit}, data){
      commit('SET_SHADED_FILES',data)
    },
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

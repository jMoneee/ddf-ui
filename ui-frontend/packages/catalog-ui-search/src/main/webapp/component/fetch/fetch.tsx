/* Copyright (c) Connexta, LLC */
import { Overwrite } from 'utility-types'
const url = require('url')
const qs = require('querystring')
const isomorphicFetch = require('isomorphic-fetch')

type Options = {
  headers?: object
  [key: string]: unknown
}

const windowFetch =
  typeof window !== 'undefined' ? window.fetch : isomorphicFetch

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__global__fetch = windowFetch

  // patch global fetch to warn about usage during development
  if (process.env.NODE_ENV !== 'production') {
    window.fetch = (...args: any[]) => {
      const error = new Error(
        [
          `Using 'window.fetch'.`,
          'Are you sure you want to do this?',
          `Most code should use 'react-component/utils/fetch' which provides defaults compatible with the backend.`,
          `To get rid of this message, use 'window.__global__fetch' instead.`,
        ].join(' ')
      )
      console.warn(error)
      // @ts-ignore
      return windowFetch(...args)
    }
  }
}

const cacheBust = (urlString: string) => {
  const { query, ...rest } = url.parse(urlString)
  return url.format({
    ...rest,
    search: '?' + qs.stringify({ ...qs.parse(query), _: Date.now() }),
  })
}

type FetchProps = (url: string, options?: Options) => Promise<Response>
const fetch: FetchProps = (url, allOptions = {}) => {
  const { headers, ...otherOptions } = allOptions
  return windowFetch(cacheBust(url), {
    credentials: 'same-origin',
    cache: 'no-cache',
    ...otherOptions,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...headers,
    },
  })
}

const __ENV__ = process.env.NODE_ENV

export type MockType = {
  id: string
  data: {
    body: string
    init: {
      status: number
      statusText: string
    }
    lastSeen: number
    lastSeenHR: string
  }
}
export type MocksType = {
  [key: string]: MockType[]
}

// @ts-ignore ts-migrate(2503) FIXME: Cannot find namespace 'SocketIOClient'.
let socket = undefined as undefined | SocketIOClient.Socket
if (__ENV__ === 'capture') {
  socket = require('socket.io-client')('http://localhost:4001')
}
let mocks = {} as MocksType
// if (__ENV__ === 'mocks') {
//   mocks = require('../../../../../dev/mocks.json')
// }

type ActionType = {
  description: string
  displayName: string
  id: string
  title: string
  url: string
}

export type MetacardPropertiesType = {
  id: string
  title: string
  'metacard.owner': string
  description: string
  created: string
  modified: string
  'security.access-individuals'?: string[]
  'security.access-individuals-read'?: string[]
  'security.access-groups'?: string[]
  'security.access-groups-read'?: string[]
  sorts?: string[] | { attribute: string; direction: string }[]
  [key: string]: any
}

type MetacardType = {
  cached: string
  properties: MetacardPropertiesType
}

export type ResultType = {
  actions: ActionType[]
  distance: null
  hasThumbnail: boolean
  isResourceLocal: boolean
  matches: {}
  metacard: MetacardType
  relevance: number
  metacardType: string
  id: string
}

export type ResponseTypeLimited = Overwrite<
  ResponseType,
  {
    results: string[]
  }
>

export type ResponseType = {
  didYouMeanFields: null
  facets: {}
  id: string
  results: ResultType[]
  showingResultsForFields: null
  status: {
    hits: number
    count: number
    elapsed: number
    id: string
    successful: boolean
  }
  types: any
  userSpellcheckIsOn: false
}

type sortType = {
  attribute: string
  direction: 'descending' | 'ascending'
}

export type cqlType = {
  batchId?: string
  count?: number
  cql: string
  id?: string
  phonetics?: boolean
  sorts?: sortType[]
  spellcheck?: boolean
  src?: string
  // 1 means the first result to start at, so 20 would start at result 20 and on
  start?: number
}

type Props = cqlType

export const URLS = {
  CQL: '/search/catalog/internal/cql',
}

/**
 * Whenever using a url (fetch or iframe, etc) you should use this as it will
 * ensure that it works under a reverse proxy.
 * @param url
 */
export const handleReverseProxy = (url: string) => {
  if (window.location.pathname === '/') {
    return url // should only happen when running the dev server
  }
  const context = window.location.pathname.split('/search/catalog/')[0] // normally "" unless we're under a reverse proxy
  return `${context}${url}`
}

const handleDevelopment = ((url, options) => {
  return fetch(handleReverseProxy(url), options).then(async (response) => {
    if (socket)
      socket.emit('mock', {
        id: `${url}:${options && options.method ? options.method : 'GET'}`,
        data: {
          body: await response.clone().text(),
          init: {
            status: response.status,
            statusText: response.statusText,
          },
          lastSeen: Date.now(),
          lastSeenHR: new Date().toLocaleString(),
        },
      })

    return response
  })
}) as FetchProps

const handleMocks = ((url, options) => {
  const mockedResponses =
    mocks[`${url}:${options && options.method ? options.method : 'GET'}`]
  if (mockedResponses !== undefined) {
    const randomMockedResponse =
      mockedResponses[Math.floor(Math.random() * mockedResponses.length)]
    return new Promise((resolve) => {
      resolve(
        new Response(
          randomMockedResponse.data.body,
          randomMockedResponse.data.init
        )
      )
    })
  }
  return fetch(handleReverseProxy(url), options)
}) as FetchProps

export type ResponseTypes = {
  CQL: ResponseType
  SESSION: {
    EXPIRY: number
    RENEW: number
  }
  SOURCES: {
    ALL: {
      available: boolean
      contentTypes: {
        name: string
        version: string
      }[]
      id: string
      sourceActions: any[]
      version: string
    }[]
    LOCAL: {
      'local-catalog-id': string
    }
  }
  USER: {
    email: string
    isGuest: false
    authRoles: {
      collaborationgroup: boolean
      entityevent: boolean
      relationship: boolean
      corporatenote: boolean
      confidence: boolean
    }
    preferences: {
      alertExpiration: number
      alertPersistence: boolean
      alerts: any[]
      animation: boolean
      columnHide: string[]
      columnOrder: string[]
      coordinateFormat: string
      dateTimeFormat: {
        datetimefmt: string
        timefmt: string
      }
      fontSize: number
      goldenLayout: any
      goldenLayoutMetacard: any
      homeDisplay: string
      homeFilter: string
      homeSort: string
      hoverPreview: boolean
      id: string
      'inspector-detailsHidden': string[]
      'inspector-detailsOrder': string[]
      'inspector-summaryOrder': string[]
      'inspector-summaryShown': string[]
      mapLayers: any[]
      querySettings: {
        sources: string[]
        phonetics: boolean
        sorts: { attribute: string; direction: string }[]
        spellcheck: boolean
        type: string
      }
      resultBlacklist: []
      resultCount: number
      resultDisplay: string
      resultPreview: string[]
      theme: {
        customBackgroundAccentContent: string
        customBackgroundContent: string
        customBackgroundDropdown: string
        customBackgroundModal: string
        customBackgroundNavigation: string
        customBackgroundSlideout: string
        customFavoriteColor: string
        customNegativeColor: string
        customPositiveColor: string
        customPrimaryColor: string
        customWarningColor: string
        spacingMode: 'comfortable' | 'cozy' | 'compact'
        theme: 'dark' | 'light' | 'sea' | 'custom'
      }
      timeZone: string
      uploads: any[]
      visualization: string
    }
    roles: string[]
    userid: string
    username: string
  }
  CONFIG: {
    DATATYPE: {
      datatype: string[]
    }
    METACARDTYPES: {
      ENUMERATIONS: {
        [key: string]: string[]
      }
      ALL: {
        [key: string]: {
          [key: string]: {
            id: string
            isInjected: boolean
            multivalued: boolean
            type:
              | 'STRING'
              | 'LONG'
              | 'INTEGER'
              | 'DOUBLE'
              | 'FLOAT'
              | 'SHORT'
              | 'GEOMETRY'
              | 'BINARY'
              | 'XML'
          }
        }
      }
    }
    PLATFORM: {
      background: string | null
      color: string | null
      favIcon: string
      footer: string | null
      header: string | null
      productImage: string
      /**
       * in minutes
       */
      timeout: number
      title: string
      vendorImage: string
      version: string
    }
    APP: {
      attributeAliases: any
      attributeDescriptions: any
      autoMergeTime: number
      basicSearchMatchType: string
      basicSearchTemporalSelectionDefault: string[]
      bingKey: string
      branding: string
      customBackgroundAccentContent: string
      customBackgroundContent: string
      customBackgroundDropdown: string
      customBackgroundModal: string
      customBackgroundNavigation: string
      customBackgroundSlideout: string
      customFavoriteColor: string
      customNegativeColor: string
      customPositiveColor: string
      customPrimaryColor: string
      customWarningColor: string
      defaultLayout: any
      disableLocalCatalog: boolean
      disableUnknownErrorBox: boolean
      editorAttributes: any[]
      enums: any
      exportResultLimit: number
      externalAuthentication: boolean
      facetWhitelist: any[]
      gazetteer: boolean
      hiddenAttributes: string[]
      i18n: {
        [key: string]: string
      }
      imageryProviders: {
        alpha: number
        name: string
        order: number
        parameters: any
        proxyEnabled: boolean
        show: boolean
        type: string
        url: string
      }[]
      isArchiveSearchDisabled: boolean
      isCacheDisabled: boolean
      isEditingAllowed: boolean
      isExperimental: boolean
      isHistoricalSearchDisabled: boolean
      isMetacardPreviewDisabled: boolean
      isPhoneticsEnabled: boolean
      isSpellcheckEnabled: boolean
      isVersioningEnabled: boolean
      listTemplates: any[]
      mapHome: string
      onlineGazetteer: boolean
      product: string
      projection: string
      queryFeedbackEmailBodyTemplate: string
      queryFeedbackEmailSubjectTemplate: string
      queryFeedbackEnabled: boolean
      readOnly: string[]
      relevancePrecision: number
      requiredAttributes: any[]
      resultCount: number
      resultShow: any[]
      /**
       * in milliseconds
       */
      scheduleFrequencyList: number[]
      showIngest: boolean
      showLogo: boolean
      showRelevanceScores: boolean
      showTask: boolean
      showWelcome: boolean
      sourcePollInterval: number
      spacingMode: string
      summaryShow: string[]
      terrainProvider: { type: string; url: string }
      theme: 'light' | 'dark' | 'custom' | 'sea'
      /**
       * in milliseconds
       */
      timeout: number
      typeNameMapping: any
      useHyphensInUuid: boolean
      version: string
      webSocketsEnabled: boolean
      zoomPercentage: number
    }
  }
}

export const COMMANDS = {
  FETCH: ((url, options) => {
    if (__ENV__ === 'capture') {
      return handleDevelopment(url, options)
    } else if (__ENV__ === 'mocks') {
      return handleMocks(url, options)
    }

    return fetch(handleReverseProxy(url), options)
  }) as FetchProps,
  CQL: async (
    props: Props,
    signal?: AbortController['signal']
  ): Promise<ResponseType> => {
    const response = await COMMANDS.FETCH('/search/catalog/internal/cql', {
      method: 'POST',
      body: JSON.stringify(props),
      signal,
    })
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const data = await response.json()
    return data
  },
  SESSION: {
    RENEW: async (): Promise<ResponseTypes['SESSION']['RENEW']> => {
      const response = await COMMANDS.FETCH(
        '/search/catalog/internal/session/renew',
        {}
      )
      const data = await response.json()
      return data
    },
    EXPIRY: async (): Promise<ResponseTypes['SESSION']['EXPIRY']> => {
      const response = await COMMANDS.FETCH(
        '/search/catalog/internal/session/expiry',
        {}
      )
      const data = await response.json()
      return data
    },
  },
  SOURCES: {
    ALL: async (): Promise<ResponseTypes['SOURCES']['ALL']> => {
      const response = await COMMANDS.FETCH(
        '/search/catalog/internal/catalog/sources',
        {}
      )
      const data = await response.json()
      return data
    },
    LOCAL: async (): Promise<ResponseTypes['SOURCES']['LOCAL']> => {
      const response = await COMMANDS.FETCH(
        '/search/catalog/internal/localcatalogid',
        {}
      )
      const data = await response.json()
      return data
    },
  },
  USER: async (): Promise<ResponseTypes['USER']> => {
    const response = await COMMANDS.FETCH('/search/catalog/internal/user', {})
    const data = await response.json()
    return data
  },
  CONFIGS: {
    APP: async (): Promise<ResponseTypes['CONFIG']['APP']> => {
      const response = await COMMANDS.FETCH(
        '/search/catalog/internal/config',
        {}
      )
      const data = await response.json()
      return data
    },
    PLATFORM: async (): Promise<ResponseTypes['CONFIG']['PLATFORM']> => {
      const response = await COMMANDS.FETCH(
        '/search/catalog/internal/platform/config/ui',
        {}
      )
      const data = await response.json()
      return data
    },
    DATATYPE: async (): Promise<ResponseTypes['CONFIG']['DATATYPE']> => {
      const response = await COMMANDS.FETCH(
        '/search/catalog/internal/enumerations/attribute/datatype',
        {}
      )
      const data = await response.json()
      return data
    },
    METACARDTYPES: {
      ALL: async (): Promise<
        ResponseTypes['CONFIG']['METACARDTYPES']['ALL']
      > => {
        const response = await COMMANDS.FETCH(
          '/search/catalog/internal/metacardtype',
          {}
        )
        const data = await response.json()
        return data
      },
      ENUMERATIONS: async ({
        metacardTypeName,
      }: {
        metacardTypeName: string
      }): Promise<ResponseTypes['CONFIG']['METACARDTYPES']['ALL']> => {
        const response = await COMMANDS.FETCH(
          `/search/catalog/internal/enumerations/metacardtype/${metacardTypeName}`,
          {}
        )
        const data = await response.json()
        return data
      },
    },
  },
}

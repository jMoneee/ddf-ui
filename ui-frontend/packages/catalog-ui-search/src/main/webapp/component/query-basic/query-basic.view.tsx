/**
 * Copyright (c) Codice Foundation
 *
 * This is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser
 * General Public License as published by the Free Software Foundation, either version 3 of the
 * License, or any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
 * even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details. A copy of the GNU Lesser General Public License
 * is distributed along with this program and can be found at
 * <http://www.gnu.org/licenses/lgpl.html>.
 *
 **/
import * as React from 'react'
import { hot } from 'react-hot-loader'
const _ = require('underscore')
const IconHelper = require('../../js/IconHelper.js')
const properties = require('../../js/properties.js')
import cql from '../../js/cql'
const metacardDefinitions = require('../singletons/metacard-definitions.js')
const CQLUtils = require('../../js/CQLUtils.js')
import QuerySettings from '../query-settings/query-settings'
import QueryTimeReactView, {
  BasicFilterClass,
} from '../query-time/query-time.view'

const METADATA_CONTENT_TYPE = 'metadata-content-type'
const searchButtonText = 'Search'
import TextField from '@material-ui/core/TextField'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import Button from '@material-ui/core/Button'
import { useState } from 'react'
import {
  FilterBuilderClass,
  FilterClass,
  isFilterBuilderClass,
} from '../filter-builder/filter.structure'
import { useBackbone } from '../selection-checkbox/useBackbone.hook'
import FilterInput from '../../react-component/filter/filter-input'
import Swath from '../swath/swath'
import Grid from '@material-ui/core/Grid'
import Chip from '@material-ui/core/Chip'
import Autocomplete from '@material-ui/lab/Autocomplete'
import TypedMetacardDefs from '../tabs/metacard/metacardDefinitions'
import SearchBar from '../search-bar/search-bar'
import styled from 'styled-components'
import useSnack from '../hooks/useSnack'
import { COMMANDS } from '../fetch/fetch'
import { CLOSEABLE_ERROR, CLOSEABLE_INFO } from '../snack/snack-props-presets'
import { useHistory } from 'react-router-dom'

function isNested(filter: any) {
  let nested = false
  filter.filters.forEach((subfilter: any) => {
    nested = nested || subfilter.filters
  })
  return nested
}

function getMatchTypeAttribute() {
  return metacardDefinitions.metacardTypes[properties.basicSearchMatchType]
    ? properties.basicSearchMatchType
    : 'datatype'
}

function getAllValidValuesForMatchTypeAttribute(): {
  [key: string]: {
    label: string
    value: string
    class: string
  }
} {
  const matchTypeAttr = getMatchTypeAttribute()
  return metacardDefinitions.enums[matchTypeAttr]
    ? (metacardDefinitions.enums[matchTypeAttr] as Array<string>).reduce(
        (blob, value: any) => {
          blob[value] = {
            label: value,
            value,
            class: 'icon ' + IconHelper.getClassByName(value),
          }
          return blob
        },
        {} as { [key: string]: { label: string; value: string; class: string } }
      )
    : {}
}

const determinePropertiesToApplyTo = ({
  value,
}: {
  value: PropertyValueMapType['anyType']['properties']
}): Array<{ label: string; value: string }> => {
  return value.map((property) => {
    return {
      label: TypedMetacardDefs.getAlias({ attr: property }),
      value: property,
    }
  })
}

function isTypeLimiter(filter: any) {
  const typesFound = _.uniq(filter.filters.map(CQLUtils.getProperty))
  const metadataContentTypeSupported = Boolean(
    metacardDefinitions.metacardTypes[METADATA_CONTENT_TYPE]
  )
  if (metadataContentTypeSupported) {
    return (
      typesFound.length === 2 &&
      typesFound.includes(METADATA_CONTENT_TYPE) &&
      typesFound.includes(getMatchTypeAttribute())
    )
  } else {
    return typesFound.length === 1 && typesFound[0] === getMatchTypeAttribute()
  }
}

// strip extra quotes
const stripQuotes = (property: any) => {
  return property.replace(/^"(.+(?="$))"$/, '$1')
}

function isAnyDate(filter: any) {
  if (!filter.filters) {
    return (
      metacardDefinitions.metacardTypes[stripQuotes(filter.property)].type ===
      'DATE'
    )
  }
  let typesFound = {} as any
  let valuesFound = {} as any
  filter.filters.forEach((subfilter: any) => {
    typesFound[subfilter.type] = true
    valuesFound[subfilter.value] = true
  })
  typesFound = Object.keys(typesFound)
  valuesFound = Object.keys(valuesFound)
  if (typesFound.length > 1 || valuesFound.length > 1) {
    return false
  } else {
    const attributes = filter.filters.map(
      (subfilter: any) => subfilter.property
    )
    return (
      metacardDefinitions.metacardTypes[stripQuotes(attributes[0])].type ===
      'DATE'
    )
  }
}

function handleAnyDateFilter(propertyValueMap: any, filter: any) {
  propertyValueMap['anyDate'] = propertyValueMap['anyDate'] || []
  let existingFilter = propertyValueMap['anyDate'].filter(
    (anyDateFilter: any) =>
      anyDateFilter.type ===
      (filter.filters ? filter.filters[0].type : filter.type)
  )[0]
  if (!existingFilter) {
    existingFilter = {
      property: [],
    }
    propertyValueMap['anyDate'].push(existingFilter)
  }
  existingFilter.property = existingFilter.property.concat(
    filter.filters
      ? filter.filters.map((subfilter: any) => stripQuotes(subfilter.property))
      : [stripQuotes(filter.property)]
  )
  existingFilter.type = filter.filters ? filter.filters[0].type : filter.type
  existingFilter.value = filter.filters ? filter.filters[0].value : filter.value

  if (existingFilter.type === 'DURING') {
    existingFilter.from = filter.filters ? filter.filters[0].from : filter.from
    existingFilter.to = filter.filters ? filter.filters[0].to : filter.to
  }
}

type PropertyValueMapType = {
  anyText: Array<FilterClass>
  anyDate: Array<BasicFilterClass>
  anyGeo: Array<FilterClass>
  anyType: {
    on: boolean
    properties: string[]
  }
  [key: string]: any
}

function translateFilterToBasicMap(filter: any) {
  const propertyValueMap = {
    anyDate: [],
    anyText: [],
    anyGeo: [],
    anyType: {
      on: false,
      properties: [],
    },
  } as PropertyValueMapType
  let downConversion = false

  if (!filter.filters && isAnyDate(filter)) {
    handleAnyDateFilter(propertyValueMap, filter)
  }

  if (filter.filters) {
    filter.filters.forEach((filter: any) => {
      if (!filter.filters && isAnyDate(filter)) {
        handleAnyDateFilter(propertyValueMap, filter)
      } else if (!filter.filters) {
        propertyValueMap[CQLUtils.getProperty(filter)] =
          propertyValueMap[CQLUtils.getProperty(filter)] || []
        if (
          propertyValueMap[CQLUtils.getProperty(filter)].filter(
            (existingFilter: any) => existingFilter.type === filter.type
          ).length === 0
        ) {
          propertyValueMap[CQLUtils.getProperty(filter)].push(filter)
        }
      } else if (!isNested(filter) && isAnyDate(filter)) {
        handleAnyDateFilter(propertyValueMap, filter)
      } else if (!isNested(filter) && isTypeLimiter(filter)) {
        propertyValueMap[CQLUtils.getProperty(filter.filters[0])] =
          propertyValueMap[CQLUtils.getProperty(filter.filters[0])] || []
        filter.filters
          .filter(
            (subfilter: FilterClass) =>
              CQLUtils.getProperty(subfilter) ===
              CQLUtils.getProperty(filter.filters[0])
          )
          .forEach((subfilter: FilterClass) => {
            propertyValueMap[CQLUtils.getProperty(filter.filters[0])].push(
              subfilter
            )
          })
      } else {
        downConversion = true
      }
    })
  } else {
    propertyValueMap[CQLUtils.getProperty(filter)] =
      propertyValueMap[CQLUtils.getProperty(filter)] || []
    propertyValueMap[CQLUtils.getProperty(filter)].push(filter)
  }

  if (propertyValueMap.anyText.length === 0) {
    propertyValueMap.anyText.push(
      new FilterClass({
        type: 'ILIKE',
        property: 'anyText',
        value: '',
      })
    )
  }
  // if datatype exists, this maps to "anyType" (we expand to multiple attributes going out, but can look at just datatype when coming in)
  if (propertyValueMap.datatype) {
    propertyValueMap.anyType.on = true
    propertyValueMap.anyType.properties = propertyValueMap.datatype
      .map((filter: FilterClass) => filter.value)
      .filter((val: string) => val !== '*') // allows us to depend on directly on filterTree with minimal weirdness, see constructFilterFromBasicFilter method for why this is necessary
  }
  return {
    propertyValueMap,
    downConversion,
  } as {
    propertyValueMap: PropertyValueMapType
    downConversion: boolean
  }
}

function getFilterTree(model: any) {
  if (typeof model.get('filterTree') === 'object') {
    return model.get('filterTree')
  }
  return cql.simplify(cql.read(model.get('cql')))
}

type BooleanEndpointReturnType = {
  cql?: string
  message?: string
}

const getCqlFromSearchText = async ({
  searchText,
  signal,
}: {
  searchText: string | null
  signal?: AbortSignal
}) => {
  let trimmedInput = searchText!.trim()

  if (trimmedInput) {
    const res = await COMMANDS.FETCH(
      `/search/catalog/internal/isri/boolean-search/cql?q=${encodeURIComponent(
        trimmedInput!
      )}`,
      {
        signal,
      }
    )

    const json = (await res.json()) as BooleanEndpointReturnType
    if (json.message) {
      return null // something went wrong, bail early
    }
    if (json.cql) {
      return json.cql
    }
    return null
  }
  return ''
}

const updateSearchTextCql = async ({
  setSearchTextCql,
  searchText,
  setLoading,
  signal,
}: {
  setSearchTextCql: React.Dispatch<React.SetStateAction<string | null>>
  searchText: string | null
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  signal: AbortSignal
}) => {
  const value = await getCqlFromSearchText({ searchText, signal })
  setSearchTextCql(value)
  setLoading(false)
}

const useSearchTextCql = ({ searchText }: { searchText: string | null }) => {
  const [searchTextCql, setSearchTextCql] = useState('' as string | null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setLoading(false)
    const abortController = new AbortController()
    setLoading(true)
    updateSearchTextCql({
      setSearchTextCql,
      searchText,
      setLoading,
      signal: abortController.signal,
    })

    return () => {
      abortController.abort()
    }
  }, [searchText])
  return {
    searchTextCql,
    loading,
  }
}

const ERROR_MESSAGES = {
  punctuation: (
    <div>
      Invalid Query:
      <div>
        If using characters outside the alphabet (a-z), make sure to quote them
        like so ("big.doc" or "bill's car").
      </div>
    </div>
  ),
  syntax: (
    <div>
      Invalid Query:
      <div>Check that syntax of AND / OR / NOT is used correctly.</div>
    </div>
  ),
  both: (
    <div>
      Invalid Query:
      <div>
        If using characters outside the alphabet (a-z), make sure to quote them
        like so ("big.doc" or "bill's car").
      </div>
      <div>Check that syntax of AND / OR / NOT is used correctly.</div>
    </div>
  ),
}
type QueryBasicProps = {
  model: any
}
const determineTypeFromFilterTree = ({
  filterTree,
}: {
  filterTree: FilterBuilderClass
}) => {
  if (
    filterTree.filters.length === 1 &&
    !isFilterBuilderClass(filterTree.filters[0]) &&
    filterTree.filters[0].property === 'anyText'
  ) {
    return 'basic'
  } else {
    return 'advanced'
  }
}

const SearchBarContainer = styled.div`
  display: flex;
  flex-grow: 1;
  .MuiInputBase-input {
    border: none !important;
  }
  .MuiInputBase-input:focus {
    border: none !important;
  }
`
const constructFilterFromBasicFilter = ({
  basicFilter,
}: {
  basicFilter: PropertyValueMapType
}): FilterBuilderClass => {
  const filters = [] as FilterBuilderClass['filters']
  if (basicFilter.anyText[0].value !== '') {
    filters.push(basicFilter.anyText[0])
  }

  if (basicFilter.anyDate[0] !== undefined) {
    filters.push(
      new FilterBuilderClass({
        type: 'OR',
        filters:
          basicFilter.anyDate[0].property.length !== 0
            ? basicFilter.anyDate[0].property.map((property) => {
                return {
                  ...basicFilter.anyDate[0],
                  property,
                }
              })
            : [
                {
                  ...basicFilter.anyDate[0],
                  property: 'anyDate',
                },
              ], // we need a default since we rely on the filterTree solely
      })
    )
  }

  if (basicFilter.anyGeo[0] !== undefined) {
    filters.push(basicFilter.anyGeo[0])
  }

  if (basicFilter.anyType.on && basicFilter.anyType.properties.length > 0) {
    filters.push(
      new FilterBuilderClass({
        type: 'OR',
        filters: basicFilter.anyType.properties
          .map((property) => {
            return new FilterClass({
              property: 'datatype',
              value: property,
              type: 'ILIKE',
            })
          })
          .concat(
            basicFilter.anyType.properties.map((property) => {
              return new FilterClass({
                property: 'metadata-content-type',
                value: property,
                type: 'ILIKE',
              })
            })
          ),
      })
    )
  } else if (basicFilter.anyType.on) {
    // a bit of an unfortunate hack so we can depend directly on filterTree (this will only happen if properties is blank!)
    // see the anyDate part of translateFilterToBasicMap for more details
    filters.push(
      new FilterClass({
        property: 'datatype',
        value: '*',
        type: 'ILIKE',
      })
    )
  }

  return new FilterBuilderClass({
    type: 'AND',
    filters,
  })
}

const [searchText, setSearchText] = useState<string | null>(null)
const [isLoading] = useState(false)
const { searchTextCql, loading: searchTextCqlLoading } = useSearchTextCql({
  searchText,
})
const [error] = useState(false)
const options = useState([])

const QueryBasic = (props: QueryBasicProps) => {
  const routeToSearch = (strippedModel: any, method?: string) => {
    const history = useHistory()
    const encodedQueryModel = encodeURIComponent(JSON.stringify(strippedModel))
    let route = `search/adhoc?defaultQuery=${encodedQueryModel}`

    // the method used to launch the search from another page
    if (method) {
      route += `&method=${method}`
    }

    history.push(route)
  }

  const createAdvancedSearch = ({
    filterTree,
  }: {
    filterTree: FilterBuilderClass
  }) => {
    const strippedModel = {
      filterTree,
      type: 'advanced',
    }

    routeToSearch(strippedModel, 'advanced')
  }

  const createSearch = ({ filterTree }: { filterTree: FilterBuilderClass }) => {
    routeToSearch({
      filterTree,
      type: determineTypeFromFilterTree({ filterTree }),
    })
  }

  const inputRef = React.useRef<HTMLDivElement>()
  const [basicFilter, setBasicFilter] = React.useState(
    translateFilterToBasicMap(getFilterTree(props.model)).propertyValueMap
  )
  const [typeAttributes] = React.useState(
    getAllValidValuesForMatchTypeAttribute()
  )

  const { listenTo, stopListening } = useBackbone()
  const addSnack = useSnack()
  function handleSearchClick(queryModel: any) {
    createSearch(queryModel)
  }
  /**
   * Because of how things render, auto focusing to the input is more complicated than I wish.  This ensures it works everytime, whereas autoFocus prop is unreliable
   */
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
    return () => {
      clearTimeout(timeoutId)
    }
  }, [])
  React.useEffect(() => {
    const callback = () => {
      setBasicFilter(
        translateFilterToBasicMap(getFilterTree(props.model)).propertyValueMap
      )
    }
    listenTo(props.model, 'change:filterTree', callback)
    return () => {
      stopListening(props.model, 'change:filterTree', callback)
    }
  }, [props.model])
  return (
    <>
      <div className="editor-properties px-2 py-3">
        <SearchBarContainer>
          <Grid container justify="center" alignItems="flex-start">
            <Grid item xs={1} />
            <Grid item xs={9}>
              <SearchBar
                key={searchButtonText}
                inputPlaceholder={'*'}
                searchButtonText={searchButtonText}
                onChange={(value) => setSearchText(value)}
                onSubmit={async () => {
                  if (isLoading || searchTextCqlLoading) {
                    addSnack(
                      'Still processing input, please wait and resubmit when loading is finished.',
                      CLOSEABLE_INFO
                    )
                    return
                  }
                  if (error) {
                    // @ts-ignore
                    addSnack(ERROR_MESSAGES.syntax, CLOSEABLE_ERROR)
                  } else {
                    const filterTree = getFilterTree({ searchTextCql })
                    if (filterTree) {
                      handleSearchClick({ filterTree })
                    } else {
                      // @ts-ignore
                      addSnack(ERROR_MESSAGES.punctuation, CLOSEABLE_ERROR)
                    }
                  }
                }}
                error={error || searchTextCql === null}
                errorMessage={(() => {
                  if (error) {
                    return ERROR_MESSAGES.both
                  }
                  return ERROR_MESSAGES.punctuation
                })()}
                options={options}
                loading={isLoading || searchTextCqlLoading}
              />
            </Grid>
            <Grid item xs={2}>
              <Button
                data-id="advanced-button"
                onClick={async () => {
                  if (isLoading || searchTextCqlLoading) {
                    addSnack(
                      'Still processing input, please wait and resubmit when loading is finished.',
                      CLOSEABLE_INFO
                    )
                    return
                  }
                  const filterTree = getFilterTree({ searchTextCql })
                  if (filterTree) {
                    createAdvancedSearch({ filterTree })
                  } else {
                    // @ts-ignore
                    addSnack(ERROR_MESSAGES.punctuation, CLOSEABLE_ERROR)
                  }
                }}
                color="primary"
                className="m-2 p-2"
                style={{ height: '43px' }}
              >
                Advanced
              </Button>
            </Grid>
          </Grid>
        </SearchBarContainer>
        <div className="pt-2">
          <QueryTimeReactView
            value={basicFilter.anyDate[0]}
            onChange={(newValue) => {
              basicFilter.anyDate[0] = newValue
              props.model.set(
                'filterTree',
                constructFilterFromBasicFilter({ basicFilter })
              )
            }}
          />
        </div>
        <div className="pt-2">
          <FormControlLabel
            labelPlacement="start"
            control={
              <Checkbox
                color="default"
                checked={Boolean(basicFilter.anyGeo[0])}
                onChange={(e) => {
                  if (!e.target.checked) {
                    basicFilter.anyGeo.pop()
                  } else {
                    basicFilter.anyGeo.push(
                      new FilterClass({
                        type: 'GEOMETRY',
                        property: 'anyGeo',
                        value: '',
                      })
                    )
                  }
                  props.model.set(
                    'filterTree',
                    constructFilterFromBasicFilter({ basicFilter })
                  )
                }}
              />
            }
            label="Location"
          />
          {basicFilter.anyGeo[0] ? (
            <Grid
              container
              alignItems="stretch"
              direction="row"
              wrap="nowrap"
              className="pt-2"
            >
              <Grid item>
                <Swath className="w-1 h-full" />
              </Grid>
              <Grid item className="w-full pl-2">
                <FilterInput
                  filter={
                    new FilterClass({
                      ...basicFilter.anyGeo[0],
                      property: basicFilter.anyGeo[0].property,
                    })
                  }
                  setFilter={(val: any) => {
                    basicFilter.anyGeo[0] = val
                    props.model.set(
                      'filterTree',
                      constructFilterFromBasicFilter({ basicFilter })
                    )
                  }}
                />
              </Grid>
            </Grid>
          ) : null}
        </div>
        <div className="pt-2">
          <FormControlLabel
            labelPlacement="start"
            control={
              <Checkbox
                color="default"
                checked={basicFilter.anyType.on}
                onChange={(e) => {
                  basicFilter.anyType.on = e.target.checked
                  props.model.set(
                    'filterTree',
                    constructFilterFromBasicFilter({ basicFilter })
                  )
                }}
              />
            }
            label="Types"
          />
          {basicFilter.anyType.on ? (
            <Grid
              container
              alignItems="stretch"
              direction="row"
              wrap="nowrap"
              className="pt-2"
            >
              <Grid item>
                <Swath className="w-1 h-full" />
              </Grid>
              <Grid item className="w-full pl-2">
                <Autocomplete
                  // @ts-ignore Property 'fullWidth' does not exist on type (error is wrong)
                  fullWidth
                  multiple
                  options={Object.values(typeAttributes)}
                  disableCloseOnSelect
                  getOptionLabel={(option) => option.label}
                  getOptionSelected={(option, value) =>
                    option.value === value.value
                  }
                  onChange={(_e, newValue) => {
                    basicFilter.anyType.properties = newValue.map(
                      (val) => val.value
                    )
                    props.model.set(
                      'filterTree',
                      constructFilterFromBasicFilter({ basicFilter })
                    )
                  }}
                  size="small"
                  renderOption={({ label, value }) => {
                    return (
                      <>
                        <div
                          className={`pr-2 icon ${typeAttributes[value].class}`}
                        />
                        {label}
                      </>
                    )
                  }}
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => (
                      <Chip
                        variant="outlined"
                        color="default"
                        label={
                          <>
                            <div
                              className={`pr-2 icon ${
                                typeAttributes[option.value].class
                              }`}
                            />
                            {option.label}
                          </>
                        }
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                  value={determinePropertiesToApplyTo({
                    value: basicFilter.anyType.properties,
                  })}
                  renderInput={(params) => (
                    <TextField {...params} variant="outlined" />
                  )}
                />
              </Grid>
            </Grid>
          ) : null}
        </div>
        <div className="py-5 w-full">
          <Swath className="w-full h-1" />
        </div>
        <div className="basic-settings">
          <QuerySettings model={props.model} />
        </div>
      </div>
    </>
  )
}

export default hot(module)(QueryBasic)

import React from 'react';
import { TeamView, JobList } from './TeamBuilder.js'
import SideBar from './Sidebar.js';
import OutfitList from './OutfitList.js';
import { apiKey, spreadsheetId } from './sheetsCreds.js';
import { filterData, convertArraysToObjects } from './Gsx2json.js';

export default class Main extends React.Component {
  constructor() {
    super();
    this.state = {
      data: null,
      jobData: null,
      attr: ['Ac', 'Pa', 'Un', 'Sm', 'Te', 'Ch'],
      selAttr: new Set(),
      isInclusive: false,
      view: 'card',
      isOutfitList: false,
      activeJob: null,
      teamMembers: [],
      teamSlot: null,
    };
    this.prepareOutfitData = this.prepareOutfitData.bind(this)
    this.submitFilterSelection = this.submitFilterSelection.bind(this);
    this.calculateTotalBonus = this.calculateTotalBonus.bind(this);
    this.toggleSearchTypeTrue = this.toggleSearchTypeTrue.bind(this);
    this.toggleSearchTypeFalse = this.toggleSearchTypeFalse.bind(this);
    this.toggleOutfitList = this.toggleOutfitList.bind(this);
    this.selectJob = this.selectJob.bind(this);
    this.setMember = this.setMember.bind(this);
  }

  componentDidMount() {
    console.log('Main componentDidMount')
    const sheetId = 'Stat Bonuses';
    //fetch info for Sidebar
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetId}?key=${apiKey}`)
      .then(result => result.json())
      .then(result => {
        let data = result.values; //Array of Arrays representing sheet rows
        const newState = {};
        data[0].forEach((arr) => { if (arr[0] !== 'ImageID') newState['sel' + arr[0]] = new Set() }) //Create set for each header to keep track of selected values
        newState.data = data;
        this.setState(newState);
      })
    const nextSheetId = 'Jobs';
    //fetch info for TeamBuilder
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${nextSheetId}?key=${apiKey}`)
      .then(result => result.json())
      .then(result => {
        let data = result.values; //Array of Arrays representing sheet rows
        this.setState({ jobData: data, });
      })
  }

  toggleOutfitList(index = null) {
    console.log('toggleOutfitList', index);
    this.setState((state, props) => {
      const newState = { isOutfitList: !state.isOutfitList, teamSlot: index }
      return newState;
    });
  }

  selectJob(job) {
    console.log('SelectJob', job);
    if(this.state.activeJob !== job) {
      this.setState({ activeJob: job, teamMembers: new Array(job['Idol Slots']).fill(0) })
    }
  }

  setMember(newMember) {
    this.setState((state, props) => {
      let newTeam = state.teamMembers.slice();
      let index = state.teamSlot;
      //can't have same chara on team twice
      //assume if user chooses outfit for chara on team they are changing their outfit
      for (let i = 0; i < newTeam.length; i++) {
        if (newMember['Character'] === newTeam[i]['Character']) { index = i; break; }
      }
      newTeam[index] = newMember;
      return { teamMembers: newTeam, isOutfitList: false };
    })
  }

  toggleSearchTypeTrue() {
    this.setState({ isInclusive: true })
  }

  toggleSearchTypeFalse() {
    this.setState({ isInclusive: false })
  }

  submitFilterSelection(filter) {
    return (value) => {
      console.log('submitFilterSelection', value)
      this.setState({ [filter]: value });
    }
  }

  prepareOutfitData(data, queryConfig) {
    const filteredData = filterData(data, queryConfig);
    let outfits = convertArraysToObjects(filteredData);
    if (this.state.selAttr.size > 0) {
      outfits = this.calculateTotalBonus(outfits, this.state.selAttr);
      this.sortByFilter(outfits, 'Total Bonus', false);
    }
    return outfits;
  }

  calculateTotalBonus(outfits, attrSet) { //outfits is Array of Objects of each outfit info
    //console.log(outfits);
    console.log('Main calculateTotalBonus', attrSet);
    outfits.forEach(outfitObj => {
      let total = 0;
      Array.from(attrSet).forEach(attr => total += outfitObj[attr]);
      outfitObj['Total Bonus'] = total;
    });

    //outfits.sort((a, b) => { //sort from highest to lowest queried stat bonus
    //  let totalBonusA = 0;
    //  let totalBonusB = 0;
    //  for (let attr of this.props.selAttr) {
    //    totalBonusA += a[attr.toLowerCase()];
    //    totalBonusB += b[attr.toLowerCase()];
    //  }
    //  return totalBonusB - totalBonusA;
    //})
    return outfits;
  }

  sortByFilter(outfits, filter, isAscending = true) {
    if (filter === 'Total Bonus') {
      outfits.sort((a, b) => isAscending ? a[filter] - b[filter] : b[filter] - a[filter])
    }
  }

  render() {
    console.log('Main render teamMembers', this.state.teamMembers);
    if (this.state.data && this.state.jobData) {
      const query = Object.keys(this.state).reduce((accumulator, key) => { //make Object of Sets that hold selected values
        const value = this.state[key];
        if (key.includes('sel') && key !== 'selAttr' && value.size > 0) { accumulator[key] = value; }
        return accumulator;
      }, {});
      let queryStr = Object.keys(this.state).reduce((accumulator, key) => {
        const value = this.state[key];
        if (key.includes('sel') && value.size > 0) {
          accumulator += key + ':' + Array.from(value) + ' ';
        }
        return accumulator;
      }, '');
      queryStr += `isInclusive: ${this.state.isInclusive}`
      const outfits = this.prepareOutfitData(this.state.data, { query: query, isInclusive: this.state.isInclusive })
      const jobs = convertArraysToObjects(this.state.jobData);
      const teamViewProps = {
        activeJob: this.state.activeJob,
        teamMembers: this.state.teamMembers,
        toggleOutfitList: this.toggleOutfitList,
      }
      const jobListProps = {
        jobs: jobs,
        attr: this.state.attr,
        selectJob: this.selectJob,
      }
      const outfitListProps = {
        key: queryStr,
        queryStr: queryStr,
        query: query,
        outfits: outfits,
        teamMembers: this.state.teamMembers,
        view: this.state.view,
        status: `${outfits.length} outfits found`,
        attr: this.state.attr,
        selAttr: this.state.selAttr,
        setMember: this.setMember,
        toggleOutfitList: this.toggleOutfitList,
      }
      const sidebarProps = {
        attr: this.state.attr,
        data: this.state.data,
        submitFilterSelection: this.submitFilterSelection,
        toggleTrue: this.toggleSearchTypeTrue,
        toggleFalse: this.toggleSearchTypeFalse,
        toggleOutfitList: this.toggleOutfitList,
      }
      return (
        <>
          <div id='teamBuilder'>
            <TeamView {...teamViewProps} />
            <JobList {...jobListProps} />
          </div>
          <div id='bottomContainer' style={{ top: this.state.isOutfitList ? '2rem' : '100vh' }}>
            <SideBar {...sidebarProps} />
            <OutfitList {...outfitListProps} />
          </div>
        </>
      )
    }
    else return null;
  }
}


//statusBarWidth: Integer as width of status bar in rem
//maxValue: maximum value of status bar
//attr: Array of attributes to display
//value: Obj of attr to display and corresponding values to calculate status bar (optional if bonus is provided)
//bonus: Obj of attr to display and corresponding bonus values (optional if value is provided)
export function AttrList(props) {
  const statusBarWidth = props.statusBarWidth || 5;
  return (
    <div className='attrList'>
      {props.attr.map(attr => { //display all attributes
        const value = (props.value ? props.value[attr] : 0) + (props.bonus ? props.bonus[attr] : 0);
        const numberText = (props.value ? props.value[attr] : '') + (props.bonus ? ` (+${props.bonus[attr]})` : '');
        return (
          <div className='attr' key={attr}>
            <span className={'icon ' + attr.toLowerCase()}>{attr}</span>
            {numberText.length && <span className='numberText'>{numberText}</span>}
            <span className='statusBarContainer' style={{ width: `${statusBarWidth}rem` }}>
              <span className={'statusBar ' + attr.toLowerCase()}
                style={{ width: `${value / props.maxValue * statusBarWidth}rem` }} />
            </span>
          </div>
        )
      })}
    </div>
  )
}
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BsDatepickerStore } from '../../reducer/bs-datepicker.store';
import { BsDatepickerActions } from '../../reducer/bs-datepicker.actions';
import {
  BsDatepickerViewMode, BsNavigationEvent, DatepickerRenderOptions,
  DayHoverEvent, DaysCalendarViewModel, DayViewModel, MonthHoverEvent,
  MonthsCalendarViewModel, YearHoverEvent,
  YearsCalendarViewModel
} from '../../models/index';
import 'rxjs/add/operator/filter';
import { Observable } from 'rxjs/Observable';
import { BsCustomDates } from './bs-custom-dates-view.component';

@Component({
  selector: 'bs-datepicker-container',
  providers: [BsDatepickerStore],
  template: `
    <!-- days calendar view mode -->
    <div class="bs-datepicker theme-green">
      <div class="bs-calendars-container">

        <!--calendars-->
        <div class="bs-calendar-container" [ngSwitch]="viewMode | async">
          <!--days calendar-->
          <div *ngSwitchCase="'day'">
            <bs-days-calendar-view
              *ngFor="let calendar of (daysCalendar | async)"
              [class.bs-datepicker-multiple]="(daysCalendar | async).length > 1"
              [calendar]="calendar"
              [options]="options | async"
              (onNavigate)="navigateTo($event)"
              (onViewMode)="changeViewMode($event)"
              (onHover)="dayHoverHandler($event)"
              (onSelect)="daySelectHandler($event)"
            ></bs-days-calendar-view>
          </div>

          <!--months calendar-->
          <div *ngSwitchCase="'month'">
            <bs-month-calendar-view
              *ngFor="let calendar of (monthsCalendar | async)"
              [calendar]="calendar"
              (onNavigate)="navigateTo($event)"
              (onViewMode)="changeViewMode($event)"
              (onHover)="monthHoverHandler($event)"
              (onSelect)="monthSelectHandler($event)"
            ></bs-month-calendar-view>
          </div>

          <!--years calendar-->
          <div *ngSwitchCase="'year'">
            <bs-years-calendar-view
              *ngFor="let calendar of (yearsCalendar | async)"
              [calendar]="calendar"
              (onNavigate)="navigateTo($event)"
              (onViewMode)="changeViewMode($event)"
              (onHover)="yearHoverHandler($event)"
            ></bs-years-calendar-view>
          </div>

        </div>

        <!--apply\cancel buttons-->
        <div class="bs-datepicker-buttons">
          <button class="btn btn-success">Apply</button>
          <button class="btn btn-default">Cancel</button>
        </div>

      </div>

      <!--custom dates or date ranges picker-->
      <div class="custom">
        <bs-custom-date-view [ranges]="_customRangesFish"></bs-custom-date-view>
      </div>
    </div>`,
  host: {
    '(click)': '_stopPropagation($event)',
    style: 'position: absolute; display: block;'
  }
})
export class BsDatepickerContainerComponent {
  @Input()
  set value(value: Date) {
    this._bsDatepickerStore.dispatch(this._actions.select(value));
  }

  @Output() valueChange = new EventEmitter<Date>();

  viewMode: Observable<BsDatepickerViewMode>;
  daysCalendar: Observable<DaysCalendarViewModel[]>;
  monthsCalendar: Observable<MonthsCalendarViewModel[]>;
  yearsCalendar: Observable<YearsCalendarViewModel[]>;
  options: Observable<DatepickerRenderOptions>;

  /** @deperecated */
  _customRangesFish: BsCustomDates[] = [
    {label: 'today', value: new Date()},
    {label: 'today1', value: new Date()},
    {label: 'today2', value: new Date()},
    {label: 'today3', value: new Date()}
  ];

  constructor(private _bsDatepickerStore: BsDatepickerStore,
              private _actions: BsDatepickerActions) {
    // data binding state <--> model
    // days calendar
    this.daysCalendar = this._bsDatepickerStore.select(state => state.flaggedMonths)
      .filter(months => !!months);

    // month calendar
    this.monthsCalendar = this._bsDatepickerStore.select(state => state.flaggedMonthsCalendar)
      .filter(months => !!months);

    // year calendar
    this.yearsCalendar = this._bsDatepickerStore.select(state => state.yearsCalendarFlagged)
      .filter(years => !!years);

    this.options = this._bsDatepickerStore.select(state => state.renderOptions)
      .filter(options => !!options);

    this.viewMode = this._bsDatepickerStore.select(state => state.viewMode);

    // set render options
    this._bsDatepickerStore.dispatch(this._actions.renderOptions({
      displayMonths: 1,
      showWeekNumbers: true
    }));

    // recalculate on view mode change
    this._bsDatepickerStore.select(state => state.viewMode)
      .subscribe(() => this._bsDatepickerStore.dispatch(this._actions.calculate()));

    // on selected date change
    this._bsDatepickerStore.select(state => state.selectedDate)
      .subscribe(date => this.valueChange.emit(date));

    // TODO: extract effects
    // calculate month model on view model change
    this._bsDatepickerStore
      .select(state => state.viewDate)
      .subscribe(() => this._bsDatepickerStore.dispatch(this._actions.calculate()));

    // format calendar values on month model change
    this._bsDatepickerStore
      .select(state => state.monthsModel)
      .filter(monthModel => !!monthModel)
      .subscribe(month =>
        this._bsDatepickerStore.dispatch(this._actions.format()));

    // flag day values
    this._bsDatepickerStore
      .select(state => state.formattedMonths)
      .filter(month => !!month)
      .subscribe(month =>
        this._bsDatepickerStore.dispatch(this._actions.flag()));

    // flag day values
    this._bsDatepickerStore.select(state => state.selectedDate)
      .filter(selectedDate => !!selectedDate)
      .subscribe(selectedDate =>
        this._bsDatepickerStore.dispatch(this._actions.flag()));

    // monthsCalendar
    this._bsDatepickerStore
      .select(state => state.monthsCalendar)
      .filter(state => !!state)
      .subscribe(() => this._bsDatepickerStore.dispatch(this._actions.flag()));

    // years calendar
    this._bsDatepickerStore
      .select(state => state.yearsCalendarModel)
      .filter(state => !!state)
      .subscribe(() => this._bsDatepickerStore.dispatch(this._actions.flag()));

    // on hover
    this._bsDatepickerStore.select(state => state.hoveredDate)
      .filter(hoveredDate => !!hoveredDate)
      .subscribe(hoveredDate =>
        this._bsDatepickerStore.dispatch(this._actions.flag()));
  }

  changeViewMode(event: BsDatepickerViewMode): void {
    this._bsDatepickerStore.dispatch(this._actions.changeViewMode(event));
  }

  navigateTo(event: BsNavigationEvent): void {
    this._bsDatepickerStore.dispatch(this._actions.navigateStep(event.step));
  }

  dayHoverHandler(event: DayHoverEvent): void {
    if (event.day.isOtherMonth) {
      return;
    }
    this._bsDatepickerStore.dispatch(this._actions.hoverDay(event));
    event.day.isHovered = event.isHovered;
  }

  daySelectHandler(day: DayViewModel): void {
    if (day.isOtherMonth) {
      return;
    }
    this._bsDatepickerStore.dispatch(this._actions.select(day.date));
  }

  monthHoverHandler(event: MonthHoverEvent): void {
    event.month.isHovered = event.isHovered;
  }

  monthSelectHandler(event: any): void {
    console.log(event);
  }

  yearHoverHandler(event: YearHoverEvent): void {
    event.year.isHovered = event.isHovered;
  }

  _stopPropagation(event: any): void {
    event.stopPropagation();
  }
}

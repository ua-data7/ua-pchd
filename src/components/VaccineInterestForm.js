import React, { Component } from "react";
import { Button, Spinner } from "react-bootstrap";
import { withTranslation } from 'react-i18next';
import { API } from 'aws-amplify';
import moment from 'moment';

import Start from './formSections/Start';
import Screening from "./formSections/Screening";
import Educator from "./formSections/Educator";
import ChildcareProvider from "./formSections/ChildcareProvider";
import ProtectiveServices from "./formSections/ProtectiveServices";
import EssentialServices from "./formSections/EssentialServices";
import Healthcare from "./formSections/Healthcare";
import Confirmation from "./formSections/Confirmation";


class VaccineInterestForm extends Component {
  
  constructor(props) {
    super(props);

    this.state = {
      captcha: null,
      step: 'start',
      start: null,
      screening: null,
      educators: null,
      protective_services: null,
      essential_workers: null,
      childcare_providers: null,
      healthcare_workers: null,
      loading: true,
    }

    this.updateStep = this.updateStep.bind(this);
    this.prevStep = this.prevStep.bind(this);
    this.onCaptchaUpdate = this.onCaptchaUpdate.bind(this);
    this.handleStartSubmit = this.handleStartSubmit.bind(this);
    this.handleScreeningSubmit = this.handleScreeningSubmit.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.submitPayload = this.submitPayload.bind(this);
  }

  async componentDidMount() {
    window.scrollTo(0, 0);
    return API.get("enumValues", "/enumValues")

    .then(choices => {
      this.setState({
        choices: choices,
        loading: false
      });
    })
    .catch((error) => {
      console.log(error);
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.step !== prevState.step) {
      window.scrollTo(0, 0);
    }
  }

  onCaptchaUpdate(value) {
    this.setState({captcha: value});
  }

  updateStep(value) {
    this.setState({
      step: value,
    });
  }

  prevStep(step, values) {
    this.setState({
      [this.state.step]: values,
      step: step,
    });
  }

  handleStartSubmit(e) {
    this.setState({start: e});
    this.updateStep('screening');
  }

  handleScreeningSubmit(e) {
    this.setState({screening: e});

    let occupation = e.occupation;

    if (occupation === '1') {
      this.setState({step: 'childcare_providers'})
    } else if (occupation === '2') {
      this.setState({step: 'educators'})
    } else if (occupation === '3' || occupation === '7') {
      this.setState({step: 'protective_services'});
    } else if (occupation === '4') {
      this.setState({step: 'essential_workers'});
    } else if (occupation === '5' || occupation === '6') {
      this.setState({step: 'healthcare_workers'});
    } else {
      this.handleSubmit(e);
    }
  }

  handleSubmit(e) {

    this.setState({
      [this.state.step]: e
    },() => {
      this.submitPayload();
    });

  }

  async submitPayload() {
    console.log(this.state);
    this.setState({ submitting: true });

    const start = this.state.start;
    const screening = this.state.screening;

    const payload = {
      first_name: start.first_name,
      last_name: start.last_name,
      dob: start.dob.format('YYYY-MM-DD'),
      sex: start.sex,
      email: start.email,
      residential_address: start.residential_address,
      city: start.city,
      state: start.state,
      zip: start.zip,
      phone: start.phone,
      received_first_dose: start.received_first_dose === 'true' ? true : false,
      congregate_housing: parseInt(screening.congregate_housing),
      ahcccs: parseInt(screening.accchs),
      occupation: screening.occupation ? parseInt(screening.occupation) : 0,
    };

    if (start.received_first_dose === "true") {
      payload['first_dose_date'] = moment(start.first_dose_date).format("YYYY-MM-DD");
      payload['first_dose_loc'] = parseInt(start.first_dose_loc);
      if (start.first_dose_loc === '8') {
        payload['first_dose_other_loc'] = start.first_dose_other_loc;
      }
      payload['vaccine_type'] = parseInt(start.vaccine_type)
    }

    if (screening.health_conditions.length) {
      payload['health_conditions'] = screening.health_conditions.map(val => parseInt(val, 10))
    }

    if (screening.occupation === '1') {
      let values = this.state.childcare_providers;
      payload.childcare_providers = {
        employer: values.employer,
        occupation: values.occupation,
        license: parseInt(values.license)
      };
    } else if (screening.occupation === '3' || screening.occupation === '7') {
      let values = this.state.protective_services;
      payload.protective_services = {
        employer: parseInt(values.employer),
        occupation: parseInt(values.occupation),
      };
      if (values.employer === "51") {
        payload.protective_services.other_employer = values.other_employer;
      }
      if (values.occupation === "9") {
        payload.protective_services.other_occupation = values.other_occupation;
      }

    } else if (screening.occupation === '4') {
      let values = this.state.essential_workers;
      payload.essential_workers = {
        employer: values.employer,
        occupation: parseInt(values.occupation),
      };
      if (values.occupation === "24") {
        payload.essential_workers.other_occupation = values.other_occupation;
      }
    } else if (screening.occupation === '5' || screening.occupation === '6') {
      let values = this.state.healthcare_workers;
      payload.healthcare_workers = {
        employer: values.employer,
        ltc: parseInt(values.ltc),
        occupation: parseInt(values.occupation),
      };
      if (values.occupation === "47") {
        payload.healthcare_workers.other_occupation = values.other_occupation;
      }
    } else if (screening.occupation === '2') {
      let values = this.state.educators;
      payload.educators = {
        employer: parseInt(values.employer),
        occupation: parseInt(values.occupation),
      };
      if (values.employer === "22") {
        payload.educators.other_employer = values.other_employer;
      }
      if (values.occupation === "12") {
        payload.educators.other_occupation = values.other_occupation;
      }

    }

    let submission = {
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload,
    }

    console.log(payload)

    return API.post("regPublish", "/regPublish", submission)
      .then(result => {
        this.setState({step: 'confirmation'});
        this.setState({ submitting: false });
      })
      .then(error => {
        console.log(error)
        this.setState({ submitting: false });
      });

  }

  renderStart() {
    return (
      <Start language={this.props.language}
             handleStartSubmit={this.handleStartSubmit}
             choices={this.state.choices}
             start={this.state.start}>            
      </Start>
    );
  }

  renderScreening() {
    return (
      <Screening language={this.props.language}
                 handleScreeningSubmit={this.handleScreeningSubmit}
                 choices={this.state.choices}
                 screening={this.state.screening}
                 updateStep={this.updateStep}
                 age={this.state.start.age}
                 onCaptchaUpdate={this.onCaptchaUpdate}
                 captcha={this.state.captcha}
                 submitting={this.state.submitting}
                 prevStep={this.prevStep}
                 screening={this.state.screening}>
      </Screening>
    );
  }

  renderEducator() {
    return (
      <Educator language={this.props.language}
                choices={this.state.choices}
                handleSubmit={this.handleSubmit}
                onCaptchaUpdate={this.onCaptchaUpdate}
                captcha={this.state.captcha}
                updateStep={this.updateStep}
                submitting={this.state.submitting}
                prevStep={this.prevStep}
                educators={this.state.educators}>            
      </Educator>
    );
  }

  renderChildcare() {
    return (
      <ChildcareProvider language={this.props.language}
                         choices={this.state.choices}
                         handleSubmit={this.handleSubmit}
                         onCaptchaUpdate={this.onCaptchaUpdate}
                         captcha={this.state.captcha}
                         updateStep={this.updateStep}
                         submitting={this.state.submitting}
                         prevStep={this.prevStep}
                         childcare_providers={this.state.childcare_providers}>            
      </ChildcareProvider>
    );
  }

  renderProtectiveServices() {
    return (
      <ProtectiveServices language={this.props.language}
                          choices={this.state.choices}
                          handleSubmit={this.handleSubmit}
                          onCaptchaUpdate={this.onCaptchaUpdate}
                          captcha={this.state.captcha}
                          updateStep={this.updateStep}
                          submitting={this.state.submitting}
                          prevStep={this.prevStep}
                          protective_services={this.state.protective_services}>            
      </ProtectiveServices>
    );
  }

  renderEssentialServices() {
    return (
      <EssentialServices language={this.props.language}
                         choices={this.state.choices}
                         handleSubmit={this.handleSubmit}
                         onCaptchaUpdate={this.onCaptchaUpdate}
                         captcha={this.state.captcha}
                         updateStep={this.updateStep}
                         submitting={this.state.submitting}
                         prevStep={this.prevStep}
                         essential_workers={this.state.essential_workers}>            
      </EssentialServices>
    );
  }

  renderHealthcare() {
    return (
      <Healthcare language={this.props.language}
                  choices={this.state.choices}
                  handleSubmit={this.handleSubmit}
                  onCaptchaUpdate={this.onCaptchaUpdate}
                  captcha={this.state.captcha}
                  updateStep={this.updateStep}
                  submitting={this.state.submitting}
                  prevStep={this.prevStep}
                  healthcare_workers={this.state.healthcare_workers}>            
      </Healthcare>
    );
  }

  renderConfirmation() {
    return (
      <Confirmation></Confirmation>
    );
  }

  renderLoading() {
    return (
      <Spinner animation="border" variant="secondary" className="loading"/>
    );
  }

  render() {
    
    const { t } = this.props;
    const { step } = this.state;

    return (
      <>  
        <Button className="pc-color-primary-alt-darker"
                onClick={() => this.props.changeLanguage('en')}>
          English
        </Button>
        <Button className="pc-color-primary-alt-darkest ml-2"
                onClick={() => this.props.changeLanguage('es')}>
          Español
        </Button>

        <h4>
          {t('form_title')}
        </h4>

        { this.state.loading && 
          <>
            {this.renderLoading()}
          </>
        }

        { !this.state.loading && 
          <>
            {step === 'start' &&  this.renderStart()}
            {step === 'screening' &&  this.renderScreening()}
            {step === 'educators' &&  this.renderEducator()}
            {step === 'childcare_providers' &&  this.renderChildcare()}
            {step === 'protective_services' &&  this.renderProtectiveServices()}
            {step === 'essential_workers' &&  this.renderEssentialServices()}
            {step === 'healthcare_workers' &&  this.renderHealthcare()} 
            {step === 'confirmation' &&  this.renderConfirmation()} 
          </>
        }

      </>
    );
  }
}

export default withTranslation()(VaccineInterestForm);

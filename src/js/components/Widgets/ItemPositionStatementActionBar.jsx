// This file is flooded with non-camel case, so don't flag for now, in order to find more important issues
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
import React, { Component } from "react";
import { Button } from "react-bootstrap";
import PropTypes from "prop-types";
import ReactPlayer from "react-player";
import Textarea from "react-textarea-autosize";
import { cordovaDot, prepareForCordovaKeyboard, restoreStylesAfterCordovaKeyboard } from "../../utils/cordovaUtils";
import { renderLog } from "../../utils/logging";
import ReadMore from "./ReadMore";
import PositionPublicToggle from "./PositionPublicToggle";
import SupportActions from "../../actions/SupportActions";
import SupportStore from "../../stores/SupportStore";
import VoterStore from "../../stores/VoterStore";
import { vimeoRegX, youTubeRegX, stringContains } from "../../utils/textFormat";



export default class ItemPositionStatementActionBar extends Component {
  static propTypes = {
    ballot_item_we_vote_id: PropTypes.string.isRequired,
    ballot_item_display_name: PropTypes.string,
    type: PropTypes.string.isRequired,
    comment_edit_mode_on: PropTypes.bool,
    supportProps: PropTypes.object,
    shown_in_list: PropTypes.bool,
    shouldFocus: PropTypes.bool,
  };

  constructor (props) {
    super(props);
    this.state = {
      is_public_position: undefined,
      loading: false,
      showEditPositionStatementInput: undefined,
      supportProps: undefined,
      statement_text_to_be_saved: undefined,
      transitioning: false,
      voter_photo_url_medium: "",
    };
  }

  componentDidMount () {
    if (this.props.supportProps) {
      this.setState({
        is_public_position: this.props.supportProps.is_public_position,
        statement_text_to_be_saved: this.props.supportProps.voter_statement_text,
        supportProps: this.props.supportProps,
      });
    }
    if (this.props.shouldFocus && this.textarea) {
      this.textarea.focus();
    }

    this.setState({
      showEditPositionStatementInput: this.props.comment_edit_mode_on,
      voter_full_name: VoterStore.getFullName(),
      voterIsSignedIn: VoterStore.getVoterIsSignedIn(),
      voter_photo_url_medium: VoterStore.getVoterPhotoUrlMedium(),
    });
    this.supportStoreListener = SupportStore.addListener(this.onSupportStoreChange.bind(this));
    this.voterStoreListener = VoterStore.addListener(this._onVoterStoreChange.bind(this));
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.supportProps !== undefined) {
      this.setState({
        is_public_position: nextProps.supportProps.is_public_position,
      });
    }
    if (this.state.showEditPositionStatementInput) {
      // we don't want to do anything
    } else if (nextProps.supportProps && nextProps.supportProps.voter_statement_text) {
      this.setState({
        statement_text_to_be_saved: nextProps.supportProps.voter_statement_text,
        showEditPositionStatementInput: false,
        transitioning: false,
      });
    } else {
      const voter_statement_text = (nextProps.supportProps && nextProps.supportProps.voter_statement_text) || "";
      this.setState({
        statement_text_to_be_saved: voter_statement_text,
        showEditPositionStatementInput: nextProps.comment_edit_mode_on,
        transitioning: false,
      });
    }
  }

  componentDidUpdate (prevProps) {
    if (this.textarea && prevProps.supportProps && this.state.supportProps) {
      if (prevProps.supportProps.is_oppose === true && this.state.supportProps.is_support === true) { // oppose to support
        this.textarea.focus();
      } else if (prevProps.supportProps.is_support === true && this.state.supportProps.is_oppose === true) { // support to oppose
        this.textarea.focus();
      } else if (prevProps.supportProps.is_oppose === false && prevProps.supportProps.is_support === false && this.state.supportProps.is_support === true) { // comment to support
        this.textarea.focus();
      } else if (prevProps.supportProps.is_oppose === false && prevProps.supportProps.is_support === false && this.state.supportProps.is_oppose === true) { // comment to oppose
        this.textarea.focus();
      }
    }
  }

  componentWillUnmount () {
    this.supportStoreListener.remove();
    this.voterStoreListener.remove();
  }

  // See https://reactjs.org/docs/error-boundaries.html
  static getDerivedStateFromError (error) { // eslint-disable-line no-unused-vars
    // Update state so the next render will show the fallback UI, We should have a "Oh snap" page
    return { hasError: true };
  }

  componentDidCatch (error, info) {
    // We should get this information to Splunk!
    console.error("ItemPositionStatementActionBar caught error: ", `${error} with info: `, info);
  }

  onSupportStoreChange () {
    const supportProps = SupportStore.get(this.props.ballot_item_we_vote_id);
    let statement_text_to_be_saved = "";
    let is_public_position = "";

    if (this.state.showEditPositionStatementInput) {
      if (supportProps) {
        is_public_position = supportProps.is_public_position;
      }
      this.setState({
        supportProps,
        is_public_position,
        transitioning: false,
      });
    } else {
      if (supportProps) {
        statement_text_to_be_saved = supportProps.voter_statement_text;
        is_public_position = supportProps.is_public_position;
      }
      this.setState({
        statement_text_to_be_saved,
        supportProps,
        is_public_position,
        transitioning: false,
      });
    }
  }

  _onVoterStoreChange () {
    this.setState({
      voter_full_name: VoterStore.getFullName(),
      voterIsSignedIn: VoterStore.getVoterIsSignedIn(),
      voter_photo_url_medium: VoterStore.getVoterPhotoUrlMedium(),
    });
  }

  updateStatementTextToBeSaved (e) {
    this.setState({
      statement_text_to_be_saved: e.target.value,
      showEditPositionStatementInput: true,
    });
  }

  savePositionStatement (e) {
    e.preventDefault();
    SupportActions.voterPositionCommentSave(this.props.ballot_item_we_vote_id, this.props.type, this.state.statement_text_to_be_saved);
    this.setState({ loading: true });
    if (this.state.statement_text_to_be_saved.length) {
      this.closeEditPositionStatementInput();
    }
  }

  closeEditPositionStatementInput () {
    this.setState({ showEditPositionStatementInput: false });
  }

  openEditPositionStatementInput () {
    this.setState({ showEditPositionStatementInput: true });
  }

  render () {
    renderLog(__filename);
    if (this.state.supportProps === undefined) {
      return <div />;
    }

    let { statement_text_to_be_saved } = this.state;
    const { voter_full_name, voter_photo_url_medium } = this.state;
    statement_text_to_be_saved = statement_text_to_be_saved.length === 0 ? null : statement_text_to_be_saved;

    let statementPlaceholderText;
    const horizontalEllipsis = "\u2026";
    if (this.state.supportProps.is_support) {
      if (this.props.ballot_item_display_name) {
        statementPlaceholderText = `Why you chose ${this.props.ballot_item_display_name}${horizontalEllipsis}`;
      } else {
        statementPlaceholderText = `Why you support${horizontalEllipsis}`;
      }
    } else if (this.state.supportProps.is_oppose) {
      if (this.props.ballot_item_display_name) {
        statementPlaceholderText = `Why you oppose ${this.props.ballot_item_display_name}${horizontalEllipsis}`;
      } else {
        statementPlaceholderText = `Why you oppose${horizontalEllipsis}`;
      }
    } else if (this.props.ballot_item_display_name) {
      statementPlaceholderText = `Your thoughts about ${this.props.ballot_item_display_name }${horizontalEllipsis}`;
    } else {
      statementPlaceholderText = `Your thoughts${horizontalEllipsis}`;
    }

    // Currently this "Post" text is the same given we display the visibility setting, but we may want to change this
    //  here if the near by visibility setting text changes
    let postButtonText = "Save";
    if (this.state.voterIsSignedIn) {
      postButtonText = "Post";
    }

    // if (is_public_position) {
    //   postButtonText = <span>Post</span>;
    // }

    const speaker_image_url_https = voter_photo_url_medium;
    const speaker_display_name = stringContains("Voter-", voter_full_name) ? "" : voter_full_name;
    const imagePlaceholder = <span className="position-statement__avatar"><img src={cordovaDot("/img/global/svg-icons/avatar-generic.svg")} width="34" height="34" color="#c0c0c0" alt="generic voter" /></span>;

    // The short version can be used to cut-off an exceedingly long comment. This applies to entries by the viewer,
    //  for viewing by him or herself. Not used currently.
    const short_version = false;

    const no_statement_text = !(statement_text_to_be_saved !== null && statement_text_to_be_saved.length);
    const edit_mode = this.state.showEditPositionStatementInput || no_statement_text;
    const onSavePositionStatementClick = this.state.showEditPositionStatementInput ? this.closeEditPositionStatementInput.bind(this) : this.openEditPositionStatementInput.bind(this);
    const onKeyDown = function (e) {
      const enterAndSpaceKeyCodes = [13, 32];
      if (enterAndSpaceKeyCodes.includes(e.keyCode)) {
        onSavePositionStatementClick();
      }
    };

    let video_url = "";
    let statement_text_no_url = null;
    let youtube_url;
    let vimeo_url;

    if (statement_text_to_be_saved) {
      youtube_url = statement_text_to_be_saved.match(youTubeRegX);
      vimeo_url = statement_text_to_be_saved.match(vimeoRegX);
    }

    if (youtube_url) {
      video_url = youtube_url[0];
      statement_text_no_url = statement_text_to_be_saved.replace(video_url, "");
    }

    if (vimeo_url) {
      video_url = vimeo_url[0];
      statement_text_no_url = statement_text_to_be_saved.replace(video_url, "");
    }

    return (
      <div className={this.props.shown_in_list ? "position-statement__container__in-list" : "position-statement__container"}>
        { // Show the edit box (Viewing self)
          edit_mode ? (
            <form onSubmit={this.savePositionStatement.bind(this)}>
              <div className="position-statement d-print-block">
                { speaker_image_url_https ? (
                  <img className="position-statement__avatar"
                       src={speaker_image_url_https}
                       width="34px"
                  />
                ) :
                  imagePlaceholder
                }
                <span className="position-statement__input-group u-flex u-items-start">
                  <Textarea onChange={this.updateStatementTextToBeSaved.bind(this)}
                    name="statement_text_to_be_saved"
                    className="position-statement__input u-push--sm form-control"
                    minRows={2}
                    placeholder={statementPlaceholderText}
                    defaultValue={statement_text_to_be_saved}
                    onFocus={() => prepareForCordovaKeyboard(__filename)}
                    onBlur={() => restoreStylesAfterCordovaKeyboard(__filename)}
                    inputRef={(tag) => { this.textarea = tag; }}
                  />
                  <div className="u-flex u-flex-column u-justify-between u-items-end">
                    <PositionPublicToggle ballot_item_we_vote_id={this.props.ballot_item_we_vote_id}
                                          type={this.props.type}
                                          supportProps={this.props.supportProps}
                                          className="u-flex-auto u-tr d-print-block"
                    />
                    <Button variant="outline-secondary" size="sm" type="submit">{postButtonText}</Button>
                  </div>
                </span>
              </div>
            </form> ) : (
              // Show the comment, but in read-only mode
              <div className={short_version ? "position-statement--truncated" : "position-statement"}>
                { speaker_image_url_https ? (
                  <img className="position-statement__avatar"
                       src={speaker_image_url_https}
                       width="34px"
                  />
                ) :
                  imagePlaceholder
                }
                <div className="position-statement__description u-flex u-items-start">
                  <div className="u-flex u-flex-column u-justify-between">
                    { speaker_display_name ? (
                      <span className="u-bold">
                        {speaker_display_name}
                        <br />
                      </span>
                    ) : null
                    }
                    { statement_text_no_url ?
                      <ReadMore text_to_display={statement_text_no_url} /> :
                      <ReadMore text_to_display={statement_text_to_be_saved} />
                    }
                    { video_url ?
                      <ReactPlayer url={`${video_url}`} width="300px" height="231px" /> :
                      null
                    }
                    { short_version ? (
                      <span onKeyDown={onKeyDown}
                            className="position-statement__edit-position-pseudo"
                            onClick={onSavePositionStatementClick}
                            title="Edit this position"
                      />
                    ) : null
                    }
                    <div onKeyDown={onKeyDown}
                         className="position-statement__edit-position-link"
                         onClick={onSavePositionStatementClick}
                         title="Edit this position"
                    >
                      Edit
                    </div>
                  </div>
                  <div className="u-flex u-flex-column u-justify-between u-items-end">
                    <PositionPublicToggle ballot_item_we_vote_id={this.props.ballot_item_we_vote_id}
                                          type={this.props.type}
                                          supportProps={this.props.supportProps}
                                          className="u-flex-auto u-tr d-print-block"
                    />
                  </div>
                </div>
              </div>
          )
       }
      </div>
    );
  }
}

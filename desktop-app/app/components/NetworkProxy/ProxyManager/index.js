import React, {useState} from 'react';
import cx from 'classnames';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import styles from './styles.css';
import TextField from '@material-ui/core/TextField';
import NumberFormat from 'react-number-format';
import InputAdornment from '@material-ui/core/InputAdornment';
import Select from 'react-select';
import commonStyles from '../../common.styles.css';
import {
  validateProxyConfig,
  getEmptyProxySchemeConfig,
} from '../../../utils/proxyUtils';
import {isNullOrWhiteSpaces} from '../../../utils/stringUtils';
import cloneDeep from 'lodash/cloneDeep';
import trim from 'lodash/trim';
import VisibilityIcon from '@material-ui/icons/Visibility';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import IconButton from '@material-ui/core/IconButton';
import {shell} from 'electron';
import Link from '@material-ui/core/Link';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';

const selectStyles = {
  control: selectStyles => ({
    ...selectStyles,
    backgroundColor: '#00000000',
    minHeight: '37px',
    height: '37px',
    borderColor: '#ffffff3b',
  }),
  option: (selectStyles, {data, isDisabled, isFocused, isSelected}) => {
    const color = 'white';
    return {
      ...selectStyles,
      backgroundColor: isDisabled
        ? null
        : isSelected
        ? '#ffffff40'
        : isFocused
        ? '#ffffff20'
        : null,
      color: 'white',

      ':active': {
        ...selectStyles[':active'],
        backgroundColor: !isDisabled && '#ffffff40',
      },
    };
  },
  input: selectStyles => ({...selectStyles}),
  placeholder: selectStyles => ({...selectStyles}),
  singleValue: (selectStyles, {data}) => ({...selectStyles, color: 'white'}),
  menu: selectStyles => ({...selectStyles, background: '#4b4b4b', zIndex: 100}),
};

const schemes = ['default', 'http', 'https', 'ftp'];

const protocolOptions = [
  {value: 'default', label: '(use default)'},
  {value: 'direct', label: 'DIRECT'},
  {value: 'http', label: 'HTTP'},
  {value: 'https', label: 'HTTPS'},
  {value: 'socks4', label: 'SOCKS4'},
  {value: 'socks5', label: 'SOCKS5'},
];

function ProtocolSelector({value, onChange, allowUseDefault = false}) {
  const opts = allowUseDefault ? protocolOptions : protocolOptions.slice(1);
  return (
    <Select
      options={opts}
      value={opts.find(x => x.value === value) || opts[0]}
      onChange={onChange}
      styles={selectStyles}
    />
  );
}

function NumberFormatCustom(props) {
  const {inputRef, onChange, ...other} = props;

  return (
    <NumberFormat
      {...other}
      getInputRef={inputRef}
      onValueChange={values => {
        onChange({
          target: {
            name: props.name,
            value: values.floatValue || '',
          },
        });
      }}
      allowNegative={false}
      decimalScale={0}
    />
  );
}

export default function ProxyManager({proxy, onSave}) {
  const [profile, setProfile] = useState(cloneDeep(proxy));
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [errors, setErrors] = useState([]);

  const changeValue = (scheme, prop, value) => {
    if (profile[scheme].useDefault && prop !== 'protocol') return;
    if (prop === 'useDefault' && value === true) {
      profile[scheme] = getEmptyProxySchemeConfig(true);
    }
    if (prop === 'protocol') {
      if (value === 'direct') profile[scheme] = getEmptyProxySchemeConfig();
      else profile[scheme].useDefault = false;
    }
    profile[scheme][prop] = value;
    setProfile({...profile});
  };

  const onSaveClicked = () => {
    profile.bypassList = (profile.bypassList || [])
      .map(trim)
      .filter(x => !isNullOrWhiteSpaces(x));
    schemes.forEach(s => {
      if (profile[s].useDefault) {
        profile[s] = {useDefault: true};
      } else {
        trim(profile[s].server);
      }
    });
    onSave(profile);
  };

  const getDisplayValue = (scheme, prop) => {
    if (scheme === 'default') return profile.default[prop] || '';
    else if (profile[scheme].useDefault) return profile.default[prop] || '';
    return profile[scheme][prop] || '';
  };

  const handleShowPassword = scheme => {
    visiblePasswords[scheme] = !visiblePasswords[scheme];
    setVisiblePasswords({...visiblePasswords});
  };

  const canSeePasswordToggle = scheme => {
    if (profile[scheme].useDefault)
      return profile.default.protocol !== 'direct';
    return profile[scheme].protocol !== 'direct';
  };

  const onMoreInfo = () => {
    shell.openExternal(
      'https://developer.chrome.com/extensions/proxy#bypass_list'
    );
  };

  const changeBypassList = e => {
    profile.bypassList = (e.target.value || '').split('\n');
    setProfile({...profile});
  };

  const isTextFieldDisabled = scheme => {
    return (
      !!profile[scheme].useDefault || profile[scheme].protocol === 'direct'
    );
  };
  return (
    <div className={cx(styles.proxyManagerContainer)}>
      <h3 className={styles.removeMarginTop}>Proxy Servers</h3>
      <Grid container spacing={1}>
        <Grid container item xs={12} spacing={1}>
          <Grid item xs={1}>
            <strong>Scheme</strong>
          </Grid>
          <Grid item xs={2}>
            <strong>Protocol</strong>
          </Grid>
          <Grid item xs={3}>
            <strong>Server</strong>
          </Grid>
          <Grid item xs={1}>
            <strong>Port</strong>
          </Grid>
          <Grid item xs={2}>
            <strong>Username</strong>
          </Grid>
          <Grid item xs={3}>
            <strong>Password</strong>
          </Grid>
        </Grid>

        {schemes.map(scheme => (
          <Grid key={scheme} container item xs={12} spacing={1}>
            <Grid container item xs={1} alignItems="center">
              {scheme === 'default' ? `(default)` : `${scheme}://`}
            </Grid>
            <Grid item xs={2}>
              <ProtocolSelector
                value={
                  profile[scheme].useDefault
                    ? 'default'
                    : profile[scheme].protocol
                }
                onChange={val => {
                  if (val.value === 'default')
                    changeValue(scheme, 'useDefault', true);
                  else changeValue(scheme, 'protocol', val.value);
                }}
                allowUseDefault={scheme !== 'default'}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                value={getDisplayValue(scheme, 'server')}
                fullWidth
                variant="outlined"
                className={cx(styles.titleField)}
                onChange={e => {
                  changeValue(scheme, 'server', e.target.value);
                }}
                disabled={isTextFieldDisabled(scheme)}
                error={
                  !profile[scheme].useDefault &&
                  profile[scheme].protocol !== 'direct' &&
                  isNullOrWhiteSpaces(profile[scheme].server)
                }
              />
            </Grid>
            <Grid item xs={1}>
              <TextField
                className={cx(styles.numericField)}
                value={getDisplayValue(scheme, 'port')}
                onChange={e => {
                  changeValue(scheme, 'port', e.target.value);
                }}
                fullWidth
                variant="outlined"
                InputProps={{
                  inputComponent: NumberFormatCustom,
                }}
                disabled={isTextFieldDisabled(scheme)}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                value={getDisplayValue(scheme, 'user')}
                fullWidth
                variant="outlined"
                className={cx(styles.titleField)}
                onChange={e => {
                  changeValue(scheme, 'user', e.target.value);
                }}
                disabled={isTextFieldDisabled(scheme)}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                type={visiblePasswords[scheme] ? 'text' : 'password'}
                value={getDisplayValue(scheme, 'password')}
                fullWidth
                variant="outlined"
                className={cx(styles.titleField)}
                onChange={e => {
                  changeValue(scheme, 'password', e.target.value);
                }}
                disabled={isTextFieldDisabled(scheme)}
                InputProps={{
                  endAdornment: canSeePasswordToggle(scheme) && (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => handleShowPassword(scheme)}
                        onMouseDown={() => handleShowPassword(scheme)}
                      >
                        {visiblePasswords[scheme] ? (
                          <VisibilityIcon />
                        ) : (
                          <VisibilityOffIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        ))}
      </Grid>
      <h3 className={styles.removeMarginBottom}>Bypass List</h3>
      <small>
        Servers for which you do not want to use any proxy: (One server on each
        line.){' '}
        <Link
          className={styles.wilcardsAndMoreLink}
          href="#"
          onClick={onMoreInfo}
        >
          Wilcards and more available <OpenInNewIcon fontSize="inherit" />
        </Link>
      </small>
      <div className={cx(styles.bypassListField)}>
        <TextField
          value={(profile.bypassList || []).join('\n')}
          rows={9}
          rowsMax={9}
          variant="outlined"
          onChange={changeBypassList}
          multiline
          fullWidth
          className={styles.bypassListFieldTextArea}
        />
      </div>
      <Button
        variant="contained"
        color="primary"
        aria-label="clear network cache"
        component="span"
        onClick={onSaveClicked}
        size="large"
        className={cx(styles.saveButton)}
        disabled={schemes.some(
          scheme =>
            !profile[scheme].useDefault &&
            profile[scheme].protocol !== 'direct' &&
            isNullOrWhiteSpaces(profile[scheme].server)
        )}
      >
        Save
      </Button>
    </div>
  );
}

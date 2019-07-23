import { core, flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import opn = require('opn');
import { spawn } from 'child_process';

core.Messages.importMessagesDirectory(__dirname);
const messages = core.Messages.loadMessages('sfdx-plugins-org_open_browser', 'open');;

export default class chrisgitOrgOpen extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');
  public static examples = [
    '$ Single browser                   ->  sfdx chrisgit:org:open -u scratchOrg -b iexplore',
    '$ Single browser developer console ->  sfdx chrisgit:org:open -u scratchOrg -b iexplore --devconsole',
    '$ Multiple browsers                ->  sfdx chrisgit:org:open -u scratchOrg -b "firefox, edge, chrome"',
    '$ Multiple browsers                ->  sfdx chrisgit:org:open -u scratchOrg -b firefox,edge,chrome'
  ];
  public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    browsers: flags.array({ char: 'b', required: false, description: messages.getMessage('flagBrowserDescription') }),
    devconsole: flags.boolean({ char: 'd', required: false, description: messages.getMessage('flagConsoleDescription') }),
    version: flags.version()
  };

  protected static requiresUsername = true;
  protected static supportsDevhubUsername = false;
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    this.salesforceOrgUrl(this.flags.targetusername)
      .then(url => {
        return this.addDevConsolePath(url, this.flags.devconsole);
      })
      .then(url => {
        return this.openSalesforceOrg(url, this.flags.browsers);
      })
      .catch(data => { this.ux.error(`An error occured ${data}`); });
    return {};
  }

  protected buildTargetParameter(scratchOrgAlias) {
    return scratchOrgAlias === undefined ? '' : `-u ${scratchOrgAlias}`;
  }

  protected salesforceOrgUrl(scratchOrgAlias) {
    let targetUsernameParameter = this.buildTargetParameter(scratchOrgAlias);
    let sfdxOpenOrgCommand = `force:org:open ${targetUsernameParameter} -r --json`.split(' ');
    let orgUrl = '';
    return new Promise((resolve, reject) => {
      let options = { shell: true };
      spawn('sfdx', sfdxOpenOrgCommand, options)
        .on('exit', (code) => {
          code == 0 ? resolve(orgUrl) : reject(`sfdx ${sfdxOpenOrgCommand} failed with exit code:- ${code}`);
        })
        .stdout.on('data', (data) => {
          orgUrl = JSON.parse(data).result.url;
        });
    });
  }

  protected addDevConsolePath(salesforceOrgUrl, openDevConsole) {
    return new Promise((resolve, reject) => {
      if (openDevConsole) {
        salesforceOrgUrl = salesforceOrgUrl + '&retURL=/_ui/common/apex/debug/ApexCSIPage';
      }
      resolve(salesforceOrgUrl);
    });
  }

  protected openInBrowser(salesforceOrgUrl, browser) {
    browser = browser.trim();
    if (browser === 'edge') {
      opn(`microsoft-edge:${salesforceOrgUrl}`, { wait: false });
    } else {
      opn(salesforceOrgUrl, { app: browser, wait: false });
    }
  }

  protected openInDefaultBrowser(salesforceOrgUrl) {
    this.openInBrowser(salesforceOrgUrl, '');
  }

  protected openSalesforceOrg(salesforceOrgUrl, browsers) {
    if (browsers === undefined) {
      this.openInDefaultBrowser(salesforceOrgUrl);
    } else {
      browsers.forEach(browser => {
        this.openInBrowser(salesforceOrgUrl, browser);
      });
    }
  }
}

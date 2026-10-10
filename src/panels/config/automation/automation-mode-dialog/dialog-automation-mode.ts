import "@home-assistant/webawesome/dist/components/divider/divider";
import { mdiHelpCircleOutline } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-select-box";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/input/ha-input";

import type { HaInput } from "../../../../components/input/ha-input";
import {
  AUTOMATION_DEFAULT_MAX,
  AUTOMATION_DEFAULT_MODE,
} from "../../../../data/automation";
import { MODES, isMaxMode } from "../../../../data/script";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import type {
  AutomationModeDialog,
  ScriptModeDialog,
} from "./show-dialog-automation-mode";

interface AutomationModeState {
  mode: (typeof MODES)[number];
  max?: number;
  permissionCheck?: boolean;
}

@customElement("ha-dialog-automation-mode")
class DialogAutomationMode
  extends DirtyStateProviderMixin<AutomationModeState>()(LitElement)
  implements HassDialog
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _params?: AutomationModeDialog | ScriptModeDialog;

  @state() private _newMode: (typeof MODES)[number] = AUTOMATION_DEFAULT_MODE;

  @state() private _newMax?: number;

  @state() private _newPermissionCheck = true;

  public showDialog(params: AutomationModeDialog | ScriptModeDialog): void {
    this._open = true;
    this._params = params;
    this._newMode = params.config.mode || AUTOMATION_DEFAULT_MODE;
    this._newMax = isMaxMode(this._newMode)
      ? params.config.max || AUTOMATION_DEFAULT_MAX
      : undefined;
    const isScript = params.domain === "script" || "sequence" in params.config;
    this._newPermissionCheck = isScript
      ? ((params.config as any).permission_check ?? true)
      : true;
    this._initDirtyTracking(
      { type: "shallow" },
      {
        mode: this._newMode,
        max: this._newMax,
        permissionCheck: isScript ? this._newPermissionCheck : undefined,
      }
    );
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    if (this._params?.onClose) {
      this._params.onClose();
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const title = this.hass.localize(
      "ui.panel.config.automation.editor.change_mode"
    );

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${title}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        <ha-icon-button
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.modes.learn_more"
          )}
          .path=${mdiHelpCircleOutline}
          href=${documentationUrl(this.hass, "/docs/automation/modes/")}
          slot="headerActionItems"
          target="_blank"
          rel="noopener noreferrer"
        ></ha-icon-button>
        <ha-select-box
          .options=${MODES.map((mode) => ({
            label: this.hass.localize(
              `ui.panel.config.automation.editor.modes.${mode}`
            ),
            description: this.hass.localize(
              `ui.panel.config.automation.editor.modes.${mode}_description`
            ),
            value: mode,
          }))}
          .value=${this._newMode}
          @value-changed=${this._modeChanged}
          .maxColumns=${1}
        ></ha-select-box>

        ${
          isMaxMode(this._newMode)
            ? html`
                <div class="max-value">
                  <wa-divider></wa-divider>
                  <ha-input
                    .label=${this.hass.localize(
                      `ui.panel.config.automation.editor.max.${this._newMode}`
                    )}
                    type="number"
                    name="max"
                    .value=${this._newMax?.toString() ?? ""}
                    @input=${this._valueChanged}
                  >
                  </ha-input>
                </div>
              `
            : nothing
        }
        ${
          this._params.domain === "script" || "sequence" in this._params.config
            ? html`
                <div class="permission-check">
                  <wa-divider></wa-divider>
                  <ha-settings-row>
                    <span slot="heading">
                      ${this.hass.localize(
                        "ui.panel.config.script.editor.permission_check"
                      )}
                    </span>
                    <span slot="description">
                      ${this.hass.localize(
                        "ui.panel.config.script.editor.permission_check_description"
                      )}
                    </span>
                    <ha-switch
                      .checked=${this._newPermissionCheck}
                      @change=${this._permissionCheckChanged}
                    ></ha-switch>
                  </ha-settings-row>
                </div>
              `
            : nothing
        }

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${!this.isDirtyState}
          >
            ${this.hass.localize(
              "ui.panel.config.automation.editor.change_mode"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _modeChanged(ev) {
    const mode = ev.detail.value;
    this._newMode = mode;
    if (!isMaxMode(mode)) {
      this._newMax = undefined;
    } else if (!this._newMax) {
      this._newMax = AUTOMATION_DEFAULT_MAX;
    }
    const isScript =
      this._params?.domain === "script" ||
      (this._params?.config && "sequence" in this._params.config);
    this._updateDirtyState({
      mode: this._newMode,
      max: this._newMax,
      permissionCheck: isScript ? this._newPermissionCheck : undefined,
    });
  }

  private _valueChanged(ev: InputEvent) {
    ev.stopPropagation();
    const target = ev.target as HaInput;
    if (target.name === "max") {
      this._newMax = Number(target.value);
      const isScript =
        this._params?.domain === "script" ||
        (this._params?.config && "sequence" in this._params.config);
      this._updateDirtyState({
        mode: this._newMode,
        max: this._newMax,
        permissionCheck: isScript ? this._newPermissionCheck : undefined,
      });
    }
  }

  private _permissionCheckChanged(ev: Event) {
    this._newPermissionCheck = (ev.target as HaSwitch).checked;
    const isScript =
      this._params?.domain === "script" ||
      (this._params?.config && "sequence" in this._params.config);
    this._updateDirtyState({
      mode: this._newMode,
      max: this._newMax,
      permissionCheck: isScript ? this._newPermissionCheck : undefined,
    });
  }

  private _save(): void {
    if (!this._params) {
      return;
    }
    const isScript =
      this._params.domain === "script" || "sequence" in this._params.config;
    const newConfig: any = {
      ...this._params.config,
      mode: this._newMode,
      max: this._newMax,
    };
    if (isScript) {
      if (this._newPermissionCheck === false) {
        newConfig.permission_check = false;
      } else {
        delete newConfig.permission_check;
      }
    }
    this._params.updateConfig(newConfig);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .max-value,
        .permission-check {
          margin-top: var(--ha-space-3);
        }
        ha-wa-dialog ha-icon-button[slot="headerActionItems"] {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-automation-mode": DialogAutomationMode;
  }
}

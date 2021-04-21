/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import "./App.scss";
import React, { useEffect, useState } from "react";
import { IModelBackendOptions, Viewer } from "@bentley/itwin-viewer-react";
import { LabeledSelect, Button } from "@itwin/itwinui-react";
import { Dialog, DialogButtonType } from "@bentley/ui-core";
import { ModelessDialogManager } from "@bentley/ui-framework";
import { FrontendAuthorizationClient } from "@bentley/frontend-authorization-client";

import AuthorizationClient from "./AuthorizationClient";
import { Header } from "./Header";
import { Config } from "@bentley/bentleyjs-core";

const dialogId = "example-popup";

function useForceUpdate() {
  const [, forceUpdate] = React.useState<boolean>(false);

  return React.useCallback(() => {
    forceUpdate((s: boolean) => {
      return !s;
    });
  }, []);
}

function closeDialog() {
  ModelessDialogManager.closeDialog(dialogId);
}

function ExamplePopupDialog() {
  const forceUpdate = useForceUpdate();
  const [selectValue, setSelectValue] = React.useState<number>();

  return (
    <Dialog
      title={"Popup Example"}
      opened
      modal={false}
      modelessId={dialogId}
      onModelessPointerDown={(event) =>
        ModelessDialogManager.handlePointerDownEvent(
          event,
          dialogId,
          forceUpdate
        )
      }
      style={{
        zIndex: ModelessDialogManager.getDialogZIndex(dialogId)
      }}
      movable
      width={450}
      height={220}
      onClose={closeDialog}
      onEscape={closeDialog}
      buttonCluster={[
        {
          type: DialogButtonType.OK,
          onClick: closeDialog,
          label: "OK"
        }
      ]}
    >
      <LabeledSelect
        label={"Select label"}
        value={selectValue}
        onChange={(value) => setSelectValue(value)}
        options={[
          { label: "Option1", value: 1 },
          { label: "Option2", value: 2 },
          { label: "Option3", value: 3 }
        ]}
      />
    </Dialog>
  );
}

const getOidcClient = (): FrontendAuthorizationClient => {
  return AuthorizationClient.oidcClient as FrontendAuthorizationClient;
};

const getBackend = (): IModelBackendOptions => {
  return {
    buddiRegion: Config.App.getNumber("imjs_buddi_resolve_url_using_region"),
  };
};

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState(
    AuthorizationClient.oidcClient
      ? AuthorizationClient.oidcClient.isAuthorized
      : false
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const initOidc = async () => {
      if (!AuthorizationClient.oidcClient) {
        await AuthorizationClient.initializeOidc();
      }

      try {
        // attempt silent signin
        await AuthorizationClient.signInSilent();
        setIsAuthorized(AuthorizationClient.oidcClient.isAuthorized);
      } catch (error) {
        // swallow the error. User can click the button to sign in
      }
    };
    // eslint-disable-next-line no-console
    initOidc().catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    if (isLoggingIn && isAuthorized) {
      setIsLoggingIn(false);
    }
  }, [isAuthorized, isLoggingIn]);

  const onLoginClick = async () => {
    setIsLoggingIn(true);
    await AuthorizationClient.signIn();
  };

  const onLogoutClick = async () => {
    setIsLoggingIn(false);
    await AuthorizationClient.signOut();
    setIsAuthorized(false);
  };

  return (
    <div>
      <Header
        handleLogin={onLoginClick}
        loggedIn={isAuthorized}
        handleLogout={onLogoutClick}
      />
      {isLoggingIn ? (
        <span>Logging in....</span>
      ) : (
        isAuthorized && (
          <>
            <Button
              onClick={ () => ModelessDialogManager.openDialog(<ExamplePopupDialog />, dialogId) }
            >
              <span>Open Popup</span>
            </Button>
            <Viewer
              contextId={process.env.REACT_APP_TEST_CONTEXT_ID ?? ""}
              iModelId={process.env.REACT_APP_TEST_IMODEL_ID ?? ""}
              authConfig={{ oidcClient: getOidcClient() }}
              backend={getBackend()} />
          </>
        )
      )}
    </div>
  );
};

export default App;

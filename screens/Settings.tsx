import { useView } from "~context/Provider";

export const SettingsScreen = () => {
  const { user, isLoading, onLogout } = useView();

  return (
    <>
      <button className="btn btn-accent" onClick={() => onLogout()}>
        Log out
      </button>
      <div>
        {isLoading ? "Loading..." : ""}
        {!!user ? (
          <div>
            Welcome to Plasmo, {user.displayName} your email address is{" "}
            {user.email}
          </div>
        ) : (
          ""
        )}
      </div>
    </>
  );
};

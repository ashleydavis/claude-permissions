import { IConfigPaths } from "../config";

// Stand-in directories for rule factories under test. Rules that carry no path token behave the
// same whatever these are; a test that cares about expansion builds its own IConfigPaths instead.
export const testConfigPaths: IConfigPaths = {
    projectDir: "/project",
    homeDir: "/home/user",
};

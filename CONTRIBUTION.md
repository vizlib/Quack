## Bugs
Bugs can be reported by adding issues in the repository. Submit your bug fix by creating a Pull Request, following the workflow guidlines below

> Please make sure to browse through existing issues before creating a new one.

## Workflow

1. Fork and clone the repository
    ```
    git clone git@github.com:YOUR-USERNAME/Sisyphus.git
    ```

1. Create a branch in the fork
    
    The branch should be based on the `master` branch in the master repository.

    ```
    git checkout -b my-feature-or-bugfix master
    ```

1. Commit changes on your remote repo

    Commit changes to your branch, following the [commit message conventions](https://conventionalcommits.org/).

    ```
    git commit -m "fix/feature: informative message"
    ```

1. Push the changes to your remote fork

    ```
    git push -u myfork my-feature-or-bugfix
    ```

1. Create a Pull Request

## To-do features

- [ ] Check for undocumented API usage
